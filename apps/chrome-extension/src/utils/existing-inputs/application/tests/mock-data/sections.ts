interface MockSection {
  input: string;
  output: Array<{
    label: string;
    value: string;
    section: string;
    url: string;
  }>;
}

export const mockSections = {
  company: {
    input: `
      <div id="f_company">
        <div class="border-gray-300 text-[24px] font-bold">Company</div>
        <div id="name" class="q">
          <label><span>Company name</span></label>
          <input type="text" value="CoFounder, Inc." />
        </div>
        <div id="describe" class="q">
          <label><span>Describe what your company does</span></label>
          <input type="text" value="AI acme helping startups with fundraising" />
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
        label: 'Describe what your company does',
        section: 'Company',
        url: 'https://apply.ycombinator.com/application#describe',
        value: 'AI acme helping startups with fundraising',
      },
    ],
  },

  education: {
    input: `
      <div id="degrees">
        <div class="flex w-full flex-col">
          <div>
            <div class="font-bold">Stanford University</div>
            <div class="text-md hidden grow text-nowrap text-right">2016-2020</div>
            <div class="font-bold + div">Computer Science</div>
          </div>
        </div>
      </div>
    `,
    output: [
      {
        label: 'Education',
        section: 'Background',
        url: 'https://apply.ycombinator.com/application#f_background',
        value: 'Stanford University, Computer Science (2016-2020)',
      },
    ],
  },

  founders: {
    input: `
      <div id="f_founders">
        <div class="border-gray-300 text-[24px] font-bold">Founders</div>
        <div id="meet" class="q">
          <label><span>How long have the founders known one another and how did you meet?</span></label>
          <textarea>I'm awesome.</textarea>
        </div>
        <div id="others2" class="q">
          <label><span>Who writes code, or does other technical work on your product?</span></label>
          <textarea>I, Chris Watts, am the founder and lead developer.</textarea>
        </div>
      </div>
    `,
    output: [
      {
        label:
          'How long have the founders known one another and how did you meet?',
        section: 'Founders',
        url: 'https://apply.ycombinator.com/application#meet',
        value: "I'm awesome.",
      },
      {
        label: 'Who writes code, or does other technical work on your product?',
        section: 'Founders',
        url: 'https://apply.ycombinator.com/application#others2',
        value: 'I, Chris Watts, am the founder and lead developer.',
      },
    ],
  },

  idea: {
    input: `
      <div id="f_idea">
        <div class="border-gray-300 text-[24px] font-bold">Idea</div>
        <div id="exp" class="q">
          <label><span>Why did you pick this idea to work on?</span></label>
          <textarea>I chose to work on CoFounder because of firsthand experience.</textarea>
        </div>
        <div id="category" class="q">
          <label><span>Category</span></label>
          <select>
            <option>Option 1</option>
            <option selected>B2B SaaS</option>
          </select>
        </div>
      </div>
    `,
    output: [
      {
        label: 'Why did you pick this idea to work on?',
        section: 'Idea',
        url: 'https://apply.ycombinator.com/application#exp',
        value: 'I chose to work on CoFounder because of firsthand experience.',
      },
      {
        label: 'Category',
        section: 'Idea',
        url: 'https://apply.ycombinator.com/application#category',
        value: 'B2B SaaS',
      },
    ],
  },

  workHistory: {
    input: `
      <div id="experiences">
        <div class="flex w-full flex-col">
          <div>
            <div class="font-bold">Software Engineer</div>
            <div class="text-md hidden grow text-nowrap text-right">2020-2023</div>
            <div class="text-md!mb-0!text-[#555]">Built amazing things</div>
          </div>
        </div>
      </div>
    `,
    output: [
      {
        label: 'Work History',
        section: 'Background',
        url: 'https://apply.ycombinator.com/application#f_background',
        value: 'Software Engineer (2020-2023)\nBuilt amazing things',
      },
    ],
  },
} as const satisfies Record<string, MockSection>;
