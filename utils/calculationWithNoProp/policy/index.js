// Aggregate multiple policy data into a single "policy" array
export function combinePolicyData(data) {
  let combined = [];

  // Find the length of the shortest policy
  let minPolicyLength = Math.min(
    ...data.policies.map((policy) => policy.data.length)
  );

  for (let i = 0; i < data.policies.length; i++) {
    let policy = data.policies[i];

    // Only consider the years within the shortest policy length
    for (let j = 0; j < minPolicyLength; j++) {
      let yearData = policy.data[j];

      if (combined[yearData.year - 1] === undefined) {
        // Initialize an object for the combined policy data if it does not exist
        combined[yearData.year - 1] = {
          year: yearData.year
        };

        // Initialize the dynamic keys
        Object.keys(yearData).forEach((key) => {
          if (key !== 'year' && key !== 'age') {
            combined[yearData.year - 1][key] = 0;
          }
        });
      }

      // Sum up the policy data of the year
      Object.keys(yearData).forEach((key) => {
        if (key !== 'year' && key !== 'age') {
          combined[yearData.year - 1][key] += yearData[key];

          // round to the nearest cent
          combined[yearData.year - 1][key] =
            Math.round(combined[yearData.year - 1][key] * 100) / 100;
        }
      });
    }
  }

  // Return the modified data as a JSON object
  return combined;
}
