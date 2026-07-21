import { useRef, useState, useEffect } from 'react';

export function useSmoothStreaming(targetText: string, isStreaming: boolean = false, cps: number = 50) {
  const [displayedText, setDisplayedText] = useState(targetText);
  const queueRef = useRef<string>('');
  const displayedRef = useRef<string>(targetText);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(targetText);
      displayedRef.current = targetText;
      queueRef.current = '';
      return;
    }

    // 새 텍스트 조각 큐에 계산하여 push
    if (targetText.length > displayedRef.current.length + queueRef.current.length) {
      const added = targetText.slice(displayedRef.current.length + queueRef.current.length);
      queueRef.current += added;
    }
  }, [targetText, isStreaming]);

  useEffect(() => {
    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (queueRef.current.length > 0) {
        // 큐에 너무 많이 쌓이면 렌더링 속도 자동 가속 (Adaptive Acceleration)
        const multiplier = queueRef.current.length > 100 ? 3.5 : 1.0;
        const charsToAdd = Math.max(1, Math.floor(cps * multiplier * delta));

        const nextChars = queueRef.current.slice(0, charsToAdd);
        queueRef.current = queueRef.current.slice(charsToAdd);
        displayedRef.current += nextChars;
        setDisplayedText(displayedRef.current);
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cps]);

  return displayedText;
}
