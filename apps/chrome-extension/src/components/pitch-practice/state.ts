export interface State {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  answer: string;
  answerFeedback: string;
  showCamera: boolean;
  isAudioMode: boolean;
  isPlayingPrompt: boolean;
}

export type Action =
  | { type: 'START_SUBMISSION' }
  | { type: 'SUBMISSION_SUCCESS' }
  | { type: 'SUBMISSION_ERROR'; payload: unknown }
  | { type: 'SET_ANSWER'; payload: string }
  | { type: 'SET_FEEDBACK'; payload: string }
  | { type: 'TOGGLE_CAMERA'; payload: boolean }
  | { type: 'START_AUDIO_PROMPT' }
  | { type: 'END_AUDIO_PROMPT' }
  | { type: 'START_AUDIO_MODE' }
  | { type: 'END_AUDIO_MODE' }
  | { type: 'RESET_STATE' };

export const initialState: State = {
  answer: '',
  answerFeedback: '',
  error: null,
  isAudioMode: false,
  isError: false,
  isPending: false,
  isPlayingPrompt: false,
  showCamera: false,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START_SUBMISSION': {
      return { ...state, error: null, isError: false, isPending: true };
    }
    case 'SUBMISSION_SUCCESS': {
      return { ...state, isPending: false };
    }
    case 'SUBMISSION_ERROR': {
      return {
        ...state,
        error: action.payload,
        isError: true,
        isPending: false,
      };
    }
    case 'SET_ANSWER': {
      return { ...state, answer: action.payload };
    }
    case 'SET_FEEDBACK': {
      return { ...state, answerFeedback: action.payload };
    }
    case 'TOGGLE_CAMERA': {
      return {
        ...state,
        showCamera: action.payload,
      };
    }
    case 'START_AUDIO_PROMPT': {
      return { ...state, isPlayingPrompt: true };
    }
    case 'END_AUDIO_PROMPT': {
      return { ...state, isPlayingPrompt: false };
    }
    case 'START_AUDIO_MODE': {
      return { ...state, isAudioMode: true };
    }
    case 'END_AUDIO_MODE': {
      return { ...state, isAudioMode: false };
    }
    case 'RESET_STATE': {
      return { ...initialState, showCamera: false };
    }
    default: {
      return state;
    }
  }
}
