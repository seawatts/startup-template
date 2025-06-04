interface MockReadOnlySection {
  input: string;
  output: Array<{
    label: string;
    value: string;
    section: string;
    url: string;
  }>;
}

export const mockReadOnlySections = {
  company: {
    input: `
      <div id="f_company">
        <div class="border-gray-300 text-[24px] font-bold tracking-tight">Company</div>
        <div class="flex flex-col gap-12">
          <div data-q="Company name">
            <div class="text-[16px] font-bold">Company name</div>
            <div class="mt-4 whitespace-pre-line text-[16px] text-black">CoFounder, Inc.</div>
          </div>
          <div data-q="Describe what your company does in 50 characters or less.">
            <div class="text-[16px] font-bold">Describe what your company does in 50 characters or less.</div>
            <div class="mt-4 whitespace-pre-line text-[16px] text-black">AI evaluation of investor deal flow.</div>
          </div>
          <div data-q="Company URL, if any">
            <div class="text-[16px] font-bold">Company URL, if any</div>
            <div class="!mt-4">
              <a href="https://acme.ai" class="text-yc-orange text-[16px] font-semibold">https://acme.ai</a>
            </div>
          </div>
        </div>
      </div>
    `,
    output: [
      {
        label: 'Company name',
        section: 'Company',
        url: 'https://apply.ycombinator.com/application#name',
        value: 'CoFounder, Inc.',
      },
      {
        label: 'Describe what your company does in 50 characters or less.',
        section: 'Company',
        url: 'https://apply.ycombinator.com/application#describe',
        value: 'AI evaluation of investor deal flow.',
      },
      {
        label: 'Company URL, if any',
        section: 'Company',
        url: 'https://apply.ycombinator.com/application#url',
        value: 'https://acme.ai',
      },
    ],
  },

  founderBackground: {
    input: `
      <fieldset id="f_background">
        <div class="border-gray-300 text-[24px] font-bold">Background</div>
        <div id="linkedin" class="q">
          <label><span>Your LinkedIn URL</span></label>
          <div class="flex flex-row items-center gap-2">
            <input name="linkedin" type="text" value="https://www.linkedin.com/in/seawatts/" />
          </div>
        </div>
        <div id="degrees">
          <div class="flex w-full flex-col">
            <div>
              <div class="font-bold">Western Washington University</div>
              <div class="text-md hidden grow text-nowrap text-right">Sep 2008 - Jun 2012</div>
              <div>BS, Computer Science</div>
            </div>
          </div>
        </div>
        <div id="experiences">
          <div class="flex w-full flex-col">
            <div>
              <div class="font-bold">Amazon - Software Engineer</div>
              <div class="text-md hidden grow text-nowrap text-right">Aug 2017 - May 2020</div>
              <div class="text-md!mb-0!text-[#555]">Last Mile Logistics\nPrime Air Drone Delivery</div>
            </div>
          </div>
        </div>
      </fieldset>
    `,
    output: [
      {
        label: 'Education',
        section: 'Background',
        url: 'https://apply.ycombinator.com/application#f_background',
        value:
          'Western Washington University, BS, Computer Science (Sep 2008 - Jun 2012)',
      },
      {
        label: 'Work History',
        section: 'Background',
        url: 'https://apply.ycombinator.com/application#f_background',
        value:
          'Amazon - Software Engineer (Aug 2017 - May 2020)\nLast Mile Logistics\nPrime Air Drone Delivery',
      },
    ],
  },
} as const satisfies Record<string, MockReadOnlySection>;
