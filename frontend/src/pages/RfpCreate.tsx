import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { rfpApi } from '../services/api';
import type { Rfp } from '../types';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: Event & { error: string }) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function RfpCreate() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedRfp, setParsedRfp] = useState<Rfp | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const baseInputRef = useRef('');

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setSpeechSupported(true);
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let fullTranscript = '';

        // Build the complete transcript from all results
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }

        // Update input in real-time with base text + new speech
        const baseText = baseInputRef.current;
        const separator = baseText && !baseText.endsWith(' ') ? ' ' : '';
        setInput(baseText + separator + fullTranscript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        switch (event.error) {
          case 'not-allowed':
            toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
            break;
          case 'network':
            toast.error('Network error. Speech recognition requires an internet connection. Please check your connection and try again.');
            break;
          case 'no-speech':
            toast.error('No speech detected. Please try speaking again.');
            break;
          case 'audio-capture':
            toast.error('No microphone found. Please ensure a microphone is connected.');
            break;
          case 'aborted':
            // User aborted, no need to show error
            break;
          default:
            toast.error('Speech recognition error. Please try again.');
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Check if we're on localhost or HTTPS
      const isSecureContext = window.location.hostname === 'localhost' || 
                              window.location.hostname === '127.0.0.1' ||
                              window.location.protocol === 'https:';
      
      if (!isSecureContext) {
        toast.error('Speech recognition requires localhost or HTTPS. Please access via localhost:3000');
        return;
      }

      try {
        // Save current input as base text before starting
        baseInputRef.current = input;
        recognitionRef.current.start();
        setIsListening(true);
        toast.success('Listening... Speak your procurement needs');
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        toast.error('Failed to start speech recognition. Try refreshing the page.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const rfp = await rfpApi.parseNaturalLanguage(input);
      setParsedRfp(rfp);
      toast.success('RFP parsed successfully!');
    } catch (error) {
      console.error('Failed to parse RFP:', error);
      toast.error('Failed to parse your request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (!parsedRfp) return;
    toast.success('RFP created successfully!');
    navigate(`/rfps/${parsedRfp.id}`);
  };

  const examplePrompts = [
    "I need to procure laptops and monitors for our new office. Budget is $50,000 total. Need delivery within 30 days. We need 20 laptops with 16GB RAM and 15 monitors 27-inch.",
    "Looking for office furniture: 50 ergonomic chairs, 50 standing desks. Budget around $75,000. Need 1-year warranty minimum.",
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Create RFP with AI</h1>
      <p className="text-gray-600">
        Describe what you want to procure in natural language. AI will convert it to a structured RFP.
      </p>

      {!parsedRfp ? (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe your procurement needs
              </label>
              <div className="relative">
                {/* Animated border container */}
                <div className={`relative rounded-xl ${isListening ? 'p-[2px] bg-gradient-to-r from-blue-500 via-blue-300 to-blue-500 bg-[length:200%_100%] animate-shimmer' : ''}`}>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Example: I need to procure laptops and monitors for our new office..."
                    rows={6}
                    className={`w-full px-4 py-3 pr-14 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none ${
                      isListening 
                        ? 'border-transparent bg-white' 
                        : 'border-gray-300 bg-white'
                    }`}
                    disabled={isProcessing}
                  />
                </div>
                {/* Microphone button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!speechSupported) {
                      toast.error('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
                      return;
                    }
                    toggleListening();
                  }}
                  disabled={isProcessing}
                  className={`absolute right-4 bottom-4 p-2.5 rounded-full transition-all duration-300 z-10 ${
                    isListening
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  {isListening ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="1" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
              </div>
              {isListening && (
                <div className="mt-2 flex items-center gap-2 text-blue-600">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </span>
                  <span className="text-sm font-medium">Listening... Speak now</span>
                </div>
              )}
              {!isListening && (
                <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Click the microphone to use voice input
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate RFP
                </>
              )}
            </button>
          </form>

          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Example prompts (click to use):
            </h3>
            <div className="space-y-3">
              {examplePrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setInput(prompt)}
                  className="block w-full text-left p-4 text-sm text-gray-600 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 hover:text-gray-800 transition-all duration-200 group"
                >
                  <span className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center text-gray-400 group-hover:text-blue-600 transition-colors">
                      {index + 1}
                    </span>
                    <span className="italic">"{prompt}"</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-green-700 font-semibold">RFP Generated Successfully</p>
              <p className="text-green-600 text-sm">Review the details below and confirm to proceed</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6 shadow-sm">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{parsedRfp.title}</h2>
              <p className="text-gray-600 mt-2 leading-relaxed">{parsedRfp.description}</p>
            </div>

            {parsedRfp.aiSummary && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">AI Summary</p>
                    <p className="text-sm text-blue-800 leading-relaxed">{parsedRfp.aiSummary}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 border-t">
              {parsedRfp.budget && (
                <div className="p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Budget</p>
                  <p className="font-bold text-emerald-700 text-lg">${parsedRfp.budget.toLocaleString()}</p>
                </div>
              )}
              {parsedRfp.deliveryDays && (
                <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Delivery</p>
                  <p className="font-semibold text-blue-700">{parsedRfp.deliveryDays} days</p>
                </div>
              )}
              {parsedRfp.paymentTerms && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Payment Terms</p>
                  <p className="font-medium text-gray-800">{parsedRfp.paymentTerms}</p>
                </div>
              )}
              {parsedRfp.warrantyTerms && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Warranty</p>
                  <p className="font-medium text-gray-800">{parsedRfp.warrantyTerms}</p>
                </div>
              )}
            </div>

            <div className="pt-5 border-t">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Items ({parsedRfp.items.length})
              </h3>
              <div className="space-y-3">
                {parsedRfp.items.map((item, index) => (
                  <div key={index} className="group border border-gray-100 rounded-lg p-4 bg-gradient-to-br from-gray-50 to-white hover:border-blue-200 hover:shadow-sm transition-all duration-200">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm flex-shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900">{item.name}</p>
                          {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
                        </div>
                      </div>
                      <span className="inline-flex items-center px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg font-medium text-sm border border-emerald-100">
                        Qty: {item.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setParsedRfp(null)}
              className="px-5 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Edit Input
            </button>
            <button
              onClick={handleConfirm}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Confirm & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
