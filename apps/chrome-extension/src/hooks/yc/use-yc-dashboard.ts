import { useEffect, useState } from 'react';

import type { GraphQLRequest } from './utils';
import { fetchYCGraphQL } from './utils';

interface RevenueAmount {
  val: number;
  month: string;
  __typename: string;
}

interface AppQuestions {
  acc: string;
  name: string;
  url: string;
  describe: string;
  productLink: string;
  productCreds: string;
  make: string;
  where: string;
  wherewhy: string;
  howfar: string;
  worked: string;
  techstack: string;
  stage: string;
  whenbeta: string;
  usernums: string;
  revenue: string;
  revenueamount: RevenueAmount;
  revenuesource: string;
  growthrate: string;
  since: string;
  __typename: string;
}

interface ApplicantBio {
  uuid: string;
  userHnid: string;
  filledIn: boolean;
  __typename: string;
}

interface Applicant {
  uuid: string;
  emailAddress: string;
  userName: string;
  userHnid: string;
  token: string;
  bio: ApplicantBio;
  __typename: string;
}

interface YCDashboardApp {
  uuid: string;
  batch: string;
  submitted: boolean;
  submittedAt: string;
  createdAt: string;
  userHnid: string;
  editable: boolean;
  fullEditable: boolean;
  presignedVideoUrl: string | null;
  presignedDemoUrl: string | null;
  videoS3Key: string | null;
  demoS3Key: string | null;
  invited: boolean;
  status: string;
  currentBatch: boolean;
  batchShortName: string;
  batchLongName: string;
  primaryApplicantName: string;
  ycMessageCount: number;
  interviewTime: string;
  interviewWithin30Min: boolean;
  interviewInPerson: boolean;
  interviewQuestionsFilledIn: boolean;
  interviewZoomUrl: string;
  lastMessageRepliedTo: string;
  applicants: Applicant[];
  questions: AppQuestions;
  __typename: string;
}

export function useYcDashboard() {
  const [apps, setApps] = useState<YCDashboardApp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        const dashboardApps = await getYcDashboard();
        setApps(dashboardApps);
      } catch (error_) {
        setError(
          error_ instanceof Error
            ? error_
            : new Error('Failed to fetch YC dashboard'),
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  return { apps, error, isLoading };
}

async function getYcDashboard(): Promise<YCDashboardApp[]> {
  const dashboardRequest: GraphQLRequest = {
    operationName: 'APPS_DASHBOARD',
    query: `
      query APPS_DASHBOARD {
        allApps {
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
        productLink
        productCreds
        make
        where
        wherewhy
        howfar
        worked
        techstack
        stage
        whenbeta
        usernums
        revenue
        revenueamount {
          ...RevenueAmountFragment
          __typename
        }
        revenuesource
        growthrate
        since
        __typename
      }

      fragment RevenueAmountFragment on RevenueAmount {
        val
        month
        __typename
      }
    `,
    variables: {},
  };

  const response = await fetchYCGraphQL(dashboardRequest);
  const data = await response.json();
  return data?.data?.allApps ?? [];
}
