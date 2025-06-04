import { useEffect, useState } from 'react';

import type { GraphQLRequest } from './utils';
import { fetchYCGraphQL } from './utils';

export interface YCGraphqlAppResponse {
  uuid: string;
  submitted: boolean;
  submittedAt: string;
  invited: boolean;
  status: string;
  ycMessageCount: number;
  interviewTime: string;
  interviewWithin30Min: boolean;
  interviewInPerson: boolean;
  interviewQuestionsFilledIn: boolean;
  interviewZoomUrl: string;
  lastMessageRepliedTo: string;
}

export function useYcApp() {
  const [ycApp, setYcApp] = useState<YCGraphqlAppResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchYcApp() {
      setIsLoading(true);
      setError(null);

      try {
        const urlAppUuid =
          globalThis.location.pathname.match(/\/apps\/([^/]+)/)?.[1];

        const ycAppResponse = await getYcApp(urlAppUuid);
        setYcApp(ycAppResponse);
      } catch (error_) {
        setError(
          error_ instanceof Error ? error_ : new Error('Failed to fetch YC ID'),
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchYcApp();
  }, []);

  return { app: ycApp, error, isLoading };
}

async function getYcIdFromGraphQL(
  response: Response,
): Promise<YCGraphqlAppResponse | null> {
  try {
    const text = await response.text();
    const data = JSON.parse(text);

    if (data?.data?.app?.uuid) {
      return data.data.app;
    }

    return null;
  } catch (error) {
    console.error('Error parsing GraphQL response:', error);
    return null;
  }
}

async function getYcApp(
  appUuid?: string,
): Promise<YCGraphqlAppResponse | null> {
  const showAppRequest: GraphQLRequest = {
    operationName: 'SHOW_APP',
    query: `
      query SHOW_APP($appUuid: String) {
        app(uuid: $appUuid) {
          ...AppFragment
          __typename
        }
      }

      fragment AppFragment on App {
        uuid
        batch
        submitted
        submittedAt
        createdAt
        userHnid
        editable
        fullEditable
        presignedVideoUrl
        presignedDemoUrl
        videoS3Key
        demoS3Key
        invited
        status
        currentBatch
        batchShortName
        batchLongName
        primaryApplicantName
        ycMessageCount
        interviewTime
        interviewWithin30Min
        interviewInPerson
        interviewQuestionsFilledIn
        interviewZoomUrl
        lastMessageRepliedTo
        applicants {
          ...ApplicantFragment
          __typename
        }
        questions {
          ...AppQuestionsFragment
          __typename
        }
        __typename
      }

      fragment ApplicantFragment on Applicant {
        uuid
        emailAddress
        userName
        userHnid
        token
        bio {
          ...ApplicantBioFragment
          __typename
        }
        __typename
      }

      fragment ApplicantBioFragment on Bio {
        uuid
        userHnid
        filledIn
        __typename
      }

      fragment AppQuestionsFragment on AppQuestions {
        acc
        name
        url
        describe
        __typename
      }
    `,
    variables: appUuid ? { appUuid } : {},
  };

  const response = await fetchYCGraphQL(showAppRequest);
  return getYcIdFromGraphQL(response);
}
