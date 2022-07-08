import voca from 'voca';

export const problems = {
  no_subentries: "Missing 'subentries' field in entry index",
  no_include: "Missing 'subentries.include' field in entry index",
  no_directory: "No directory with name '%s'",
  no_file: "No file with name '%s'",
} as const;

type ProblemKey = keyof typeof problems;

export const problem = (key: ProblemKey, ...replacements: any[]) => voca
  .sprintf(problems[key], ...replacements);
