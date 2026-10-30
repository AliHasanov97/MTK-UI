"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Brauzerin daxili nitq tanıma API-si (Web Speech API). Əlavə servis, API açarı
 * və ya backend dəyişikliyi tələb etmir; Chrome/Edge-də işləyir.
 *
 * `onTranscript` hər dəfə cari cümlənin TAM mətnini (danışılmış final hissə +
 * hələ final olmayan aralıq hissə) alır — Chrome aralıq nəticələri tez-tez final
 * etmədiyi üçün yalnız final gözləmək "danışıram, heç nə olmur" effekti verirdi.
 */

type SpeechAlternative = { transcript: string };
type SpeechResult = { isFinal: boolean; length: number; [index: number]: SpeechAlternative };
type SpeechResultList = { length: number; [index: number]: SpeechResult };

type SpeechResultEvent = { resultIndex: number; results: SpeechResultList };
type SpeechErrorEvent = { error: string };

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Mikrofona icazə verilmədi. Brauzer ayarlarından icazəni açın.",
  "service-not-allowed": "Mikrofon bu brauzerdə bloklanıb.",
  "audio-capture": "Mikrofon tapılmadı.",
  "no-speech": "Səs eşidilmədi — yenidən cəhd edin.",
  network: "Nitq tanıma xidmətinə qoşulmaq mümkün olmadı.",
  "language-not-supported": "Bu dil brauzerdə səslə tanınmır.",
};

function getConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;

  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(
  onTranscript: (text: string) => void,
  lang = "az-AZ",
) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // İstifadəçi dayandırmayıb, sadəcə brauzer səssizlikdən dayandırıb — davam et.
  const wantsListeningRef = useRef(false);
  const failedRef = useRef(false);
  // az-AZ brauzerdə olmayanda bir dəfə brauzerin öz dilinə keçirik.
  const fallbackLangRef = useRef<string | null>(null);
  // Bu dinləmə sessiyasında artıq final olunmuş mətn.
  const committedRef = useRef("");
  const callbackRef = useRef(onTranscript);

  useEffect(() => {
    callbackRef.current = onTranscript;
  }, [onTranscript]);

  const stop = useCallback(() => {
    wantsListeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Recognition = getConstructor();

    if (!Recognition) {
      setError("Bu brauzer səslə yazmağı dəstəkləmir.");
      return;
    }

    recognitionRef.current?.abort();

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    failedRef.current = false;
    fallbackLangRef.current = null;
    committedRef.current = "";
    wantsListeningRef.current = true;

    recognition.onstart = () => {
      setError(null);
      setListening(true);
    };

    recognition.onresult = (event) => {
      let finalPart = "";
      let interimPart = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];

        if (result.isFinal) {
          finalPart += result[0].transcript;
        } else {
          interimPart += result[0].transcript;
        }
      }

      committedRef.current += finalPart;

      const combined = `${committedRef.current}${interimPart}`
        .replace(/\s+/g, " ")
        .trimStart();

      if (combined.trim().length > 0) callbackRef.current(combined);
    };

    recognition.onerror = (event) => {
      // "aborted" — istifadəçi özü dayandırdı, xəta deyil.
      if (event.error === "aborted") return;

      // Dil dəstəklənmirsə, brauzerin öz dilinə bir dəfə keç və davam et.
      if (
        event.error === "language-not-supported" &&
        fallbackLangRef.current === null &&
        typeof navigator !== "undefined" &&
        navigator.language &&
        navigator.language !== lang
      ) {
        fallbackLangRef.current = navigator.language;
        return;
      }

      failedRef.current = true;
      setError(ERROR_MESSAGES[event.error] ?? "Səs tanınmadı. Yenidən cəhd edin.");
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);

      if (wantsListeningRef.current && !failedRef.current) {
        if (fallbackLangRef.current) {
          recognition.lang = fallbackLangRef.current;
        }

        try {
          recognition.start();
        } catch {
          wantsListeningRef.current = false;
        }
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setError("Mikrofonu işə salmaq mümkün olmadı.");
      wantsListeningRef.current = false;
    }
  }, [lang]);

  // Çat bağlananda / komponent söküləndə mikrofon açıq qalmasın.
  useEffect(
    () => () => {
      wantsListeningRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    },
    [],
  );

  return { listening, error, start, stop };
}
