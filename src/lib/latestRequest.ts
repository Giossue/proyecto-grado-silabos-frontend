export const latestRequest = () => {
  let current = 0;

  return {
    begin: (): number => (current += 1),
    isCurrent: (ticket: number): boolean => ticket === current,
  };
};
