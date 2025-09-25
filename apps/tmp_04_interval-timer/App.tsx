import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  TamaguiProvider,
  Theme,
  YStack,
  XStack,
  Button,
  Card,
  Text,
  Slider,
  Switch,
  Separator,
  Progress,
  createTamagui,
} from "tamagui";
import { defaultConfig } from "@tamagui/config/v4";
import { Play, Pause, RotateCcw } from "@tamagui/lucide-icons";

// --- Types ---
type Phase = "work" | "rest";

// --- Helpers ---
const secToMMSS = (s: number) => {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const config = createTamagui(defaultConfig);

// --- App ---
export default function App() {
  return (
    <TamaguiProvider config={config} defaultTheme="light">
      <Theme name="blue">
        <YStack
          flex={1}
          backgroundColor="$background"
          padding="$4"
          gap="$4"
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={22} fontWeight="700">
            Interval Timer
          </Text>
          <TimerCard />
          <Text fontSize="$2" textAlign="center">
            Built with Tamagui UI (Button, Slider, Progress, Switch, Card)
          </Text>
        </YStack>
      </Theme>
    </TamaguiProvider>
  );
}

function TimerCard() {
  // configurable settings
  const [workSec, setWorkSec] = useState(40);
  const [restSec, setRestSec] = useState(20);
  const [rounds, setRounds] = useState(8);
  const [soundOn, setSoundOn] = useState(true);

  // runtime state
  const [phase, setPhase] = useState<Phase>("work");
  const [timeLeft, setTimeLeft] = useState(workSec);
  const [round, setRound] = useState(1);
  const [running, setRunning] = useState(false);

  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const totalForPhase = phase === "work" ? workSec : restSec;

  // percentage for Progress
  const pct = useMemo(() => {
    const v = (1 - timeLeft / totalForPhase) * 100;
    const r = Math.round(Number.isFinite(v) ? v : 0);
    return Math.min(100, Math.max(0, r));
  }, [timeLeft, totalForPhase]);

  // restart current phase when knobs change and not running
  useEffect(() => {
    if (!running) {
      setTimeLeft(phase === "work" ? workSec : restSec);
    }
  }, [workSec, restSec, phase, running]);

  // main timer effect
  useEffect(() => {
    if (!running) return;

    tickRef.current && clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev > 1) return prev - 1;
        // phase ending
        if (phase === "work") {
          setPhase("rest");
          return restSec;
        } else {
          // finished a full round
          if (round < rounds) {
            setRound((r) => r + 1);
            setPhase("work");
            return workSec;
          } else {
            // all done
            setRunning(false);
            return 0;
          }
        }
      });
    }, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [running, phase, restSec, workSec, round, rounds]);

  const start = () => {
    if (!running) {
      setRunning(true);
      if (timeLeft === 0) {
        // restart sequence
        setPhase("work");
        setRound(1);
        setTimeLeft(workSec);
      }
    }
  };
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setPhase("work");
    setRound(1);
    setTimeLeft(workSec);
  };

  return (
    <Card
      elevate
      bordered
      width="100%"
      maxWidth={560}
      padding="$4"
      borderRadius="$6"
      backgroundColor="$color2"
    >
      <YStack gap="$4">
        <YStack gap="$2">
          <Text fontSize="$2">Round</Text>
          <Text fontSize={36} fontWeight="800">
            {round} / {rounds}
          </Text>
        </YStack>

        <YStack gap="$2">
          <Text fontSize="$2">Phase</Text>
          <Text
            fontSize={28}
            fontWeight="700"
            color={phase === "work" ? "$green10" : "$yellow10"}
          >
            {phase.toUpperCase()}
          </Text>
        </YStack>

        <YStack gap="$2">
          <Text fontSize="$2">Time left</Text>
          <Text fontSize={56} fontWeight="900" fontFamily="$mono">
            {secToMMSS(timeLeft)}
          </Text>
          <Progress value={pct} max={100} borderRadius="$10" height={14}>
            <Progress.Indicator
              borderRadius="$10"
              background={phase === "work" ? "$green9" : "$yellow9"}
            />
          </Progress>
        </YStack>

        <XStack gap="$3" alignItems="center" justifyContent="center">
          <Button
            fontSize="$6"
            theme="green"
            icon={Play}
            onPress={start}
            disabled={running}
          >
            Start
          </Button>
          <Button
            fontSize="$6"
            theme="orange"
            icon={Pause}
            onPress={pause}
            disabled={!running}
          >
            Pause
          </Button>
          <Button fontSize="$6" theme="gray" icon={RotateCcw} onPress={reset}>
            Reset
          </Button>
        </XStack>

        <Separator marginVertical="$2" />

        <YStack gap="$4">
          <Knob
            label={`Work: ${secToMMSS(workSec)}`}
            min={5}
            max={600}
            step={5}
            value={workSec}
            onValueChange={setWorkSec}
          />
          <Knob
            label={`Rest: ${secToMMSS(restSec)}`}
            min={5}
            max={300}
            step={5}
            value={restSec}
            onValueChange={setRestSec}
          />
          <Knob
            label={`Rounds: ${rounds}`}
            min={1}
            max={20}
            step={1}
            value={rounds}
            onValueChange={setRounds}
          />

          <XStack alignItems="center" justifyContent="space-between">
            <Text>Sound</Text>
            <Switch checked={soundOn} onCheckedChange={setSoundOn} size="$4">
              <Switch.Thumb animation="bouncy" />
            </Switch>
          </XStack>
        </YStack>
      </YStack>
    </Card>
  );
}

function Knob({
  label,
  min,
  max,
  step,
  value,
  onValueChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onValueChange: (v: number) => void;
}) {
  return (
    <YStack gap="$2">
      <XStack justifyContent="space-between">
        <Text>{label}</Text>
        <Text>
          {min}–{max}
        </Text>
      </XStack>
      <Slider
        size="$4"
        defaultValue={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(vals) => onValueChange(vals[0])}
      >
        <Slider.Track>
          <Slider.TrackActive />
        </Slider.Track>
        <Slider.Thumb index={0} circular size="$1" />
      </Slider>
    </YStack>
  );
}
