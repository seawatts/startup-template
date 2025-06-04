export interface GeneratePitchPracticeQuestionResponse {
  question: string;
  tip: string;
}

export interface PitchPracticeFormProps {
  children: (props: {
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: unknown;
    data: unknown;
  }) => React.ReactNode;
  question?: GeneratePitchPracticeQuestionResponse;
  audio?: Blob;
}
