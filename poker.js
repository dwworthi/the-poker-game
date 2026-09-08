(function () {
  "use strict";

  const rankValues = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14
  };

  const rankNames = {
    2: "Twos",
    3: "Threes",
    4: "Fours",
    5: "Fives",
    6: "Sixes",
    7: "Sevens",
    8: "Eights",
    9: "Nines",
    10: "Tens",
    11: "Jacks",
    12: "Queens",
    13: "Kings",
    14: "Aces"
  };

  const singleNames = {
    2: "Two",
    3: "Three",
    4: "Four",
    5: "Five",
    6: "Six",
    7: "Seven",
    8: "Eight",
    9: "Nine",
    10: "Ten",
    11: "Jack",
    12: "Queen",
    13: "King",
    14: "Ace"
  };

  function compareScores(first, second) {
    const length = Math.max(
      first.length,
      second.length
    );

    for (let index = 0; index < length; index += 1) {
      const difference =
        (first[index] || 0) -
        (second[index] || 0);

      if (difference !== 0) {
        return Math.sign(difference);
      }
    }

    return 0;
  }

  function straightHigh(values) {
    const unique = Array.from(
      new Set(values)
    ).sort(function (first, second) {
      return second - first;
    });

    if (unique.includes(14)) {
      unique.push(1);
    }

    for (
      let index = 0;
      index <= unique.length - 5;
      index += 1
    ) {
      if (
        unique[index] -
        unique[index + 4] ===
        4
      ) {
        return unique[index];
      }
    }

    return null;
  }

  function describe(category, tie) {
    if (category === 8) {
      return (
        "Straight Flush — " +
        singleNames[tie[0]] +
        " high"
      );
    }

    if (category === 7) {
      return (
        "Four of a Kind — " +
        rankNames[tie[0]]
      );
    }

    if (category === 6) {
      return (
        "Full House — " +
        rankNames[tie[0]] +
        " over " +
        rankNames[tie[1]]
      );
    }

    if (category === 5) {
      return (
        "Flush — " +
        singleNames[tie[0]] +
        " high"
      );
    }

    if (category === 4) {
      return (
        "Straight — " +
        singleNames[tie[0]] +
        " high"
      );
    }

    if (category === 3) {
      return (
        "Three of a Kind — " +
        rankNames[tie[0]]
      );
    }

    if (category === 2) {
      return (
        "Two Pair — " +
        rankNames[tie[0]] +
        " and " +
        rankNames[tie[1]] +
        ", " +
        singleNames[tie[2]] +
        " kicker"
      );
    }

    if (category === 1) {
      return (
        "One Pair — " +
        rankNames[tie[0]] +
        ", " +
        singleNames[tie[1]] +
        " high kicker"
      );
    }

    return (
      "High Card — " +
      singleNames[tie[0]]
    );
  }

  function evaluateFive(cards) {
    if (
      !Array.isArray(cards) ||
      cards.length !== 5
    ) {
      throw new Error(
        "evaluateFive requires exactly five cards."
      );
    }

    const values = cards
      .map(function (card) {
        return rankValues[card.rank];
      })
      .sort(function (first, second) {
        return second - first;
      });

    if (
      values.some(function (value) {
        return !value;
      })
    ) {
      throw new Error(
        "A card has an invalid rank."
      );
    }

    const flush = cards.every(function (card) {
      return card.suit === cards[0].suit;
    });

    const highStraight = straightHigh(values);
    const counts = {};

    values.forEach(function (value) {
      counts[value] =
        (counts[value] || 0) + 1;
    });

    const groups = Object.entries(counts)
      .map(function (entry) {
        return {
          value: Number(entry[0]),
          count: entry[1]
        };
      })
      .sort(function (first, second) {
        return (
          second.count -
          first.count ||
          second.value -
          first.value
        );
      });

    let category;
    let categoryName;
    let tie;

    if (flush && highStraight) {
      category = 8;
      categoryName = "Straight Flush";
      tie = [highStraight];
    } else if (groups[0].count === 4) {
      category = 7;
      categoryName = "Four of a Kind";
      tie = [
        groups[0].value,
        groups[1].value
      ];
    } else if (
      groups[0].count === 3 &&
      groups[1].count === 2
    ) {
      category = 6;
      categoryName = "Full House";
      tie = [
        groups[0].value,
        groups[1].value
      ];
    } else if (flush) {
      category = 5;
      categoryName = "Flush";
      tie = values;
    } else if (highStraight) {
      category = 4;
      categoryName = "Straight";
      tie = [highStraight];
    } else if (groups[0].count === 3) {
      category = 3;
      categoryName = "Three of a Kind";

      tie = [groups[0].value].concat(
        groups
          .filter(function (group) {
            return group.count === 1;
          })
          .map(function (group) {
            return group.value;
          })
          .sort(function (first, second) {
            return second - first;
          })
      );
    } else if (
      groups[0].count === 2 &&
      groups[1].count === 2
    ) {
      category = 2;
      categoryName = "Two Pair";

      const pairs = groups
        .filter(function (group) {
          return group.count === 2;
        })
        .map(function (group) {
          return group.value;
        })
        .sort(function (first, second) {
          return second - first;
        });

      const kicker = groups.find(
        function (group) {
          return group.count === 1;
        }
      ).value;

      tie = [
        pairs[0],
        pairs[1],
        kicker
      ];
    } else if (groups[0].count === 2) {
      category = 1;
      categoryName = "One Pair";

      tie = [groups[0].value].concat(
        groups
          .filter(function (group) {
            return group.count === 1;
          })
          .map(function (group) {
            return group.value;
          })
          .sort(function (first, second) {
            return second - first;
          })
      );
    } else {
      category = 0;
      categoryName = "High Card";
      tie = values;
    }

    return {
      category: category,
      categoryName: categoryName,
      tiebreak: tie,
      score: [category].concat(tie),
      bestFive: cards.slice(),
      description: describe(category, tie)
    };
  }

  function combinationsOfFive(cards) {
    const combinations = [];

    for (
      let first = 0;
      first < cards.length - 4;
      first += 1
    ) {
      for (
        let second = first + 1;
        second < cards.length - 3;
        second += 1
      ) {
        for (
          let third = second + 1;
          third < cards.length - 2;
          third += 1
        ) {
          for (
            let fourth = third + 1;
            fourth < cards.length - 1;
            fourth += 1
          ) {
            for (
              let fifth = fourth + 1;
              fifth < cards.length;
              fifth += 1
            ) {
              combinations.push([
                cards[first],
                cards[second],
                cards[third],
                cards[fourth],
                cards[fifth]
              ]);
            }
          }
        }
      }
    }

    return combinations;
  }

  function evaluateSeven(cards) {
    if (
      !Array.isArray(cards) ||
      cards.length !== 7
    ) {
      throw new Error(
        "evaluateSeven requires exactly seven cards."
      );
    }

    let bestResult = null;

    combinationsOfFive(cards).forEach(
      function (combination) {
        const result =
          evaluateFive(combination);

        if (
          bestResult === null ||
          compareScores(
            result.score,
            bestResult.score
          ) > 0
        ) {
          bestResult = result;
        }
      }
    );

    return bestResult;
  }

  function testCard(rank, suit) {
    return {
      rank: rank,
      suit: suit
    };
  }

  function runTests() {
    const spades = "♠";
    const hearts = "♥";
    const diamonds = "♦";
    const clubs = "♣";

    const testCases = [
      [
        "High Card",
        [
          testCard("A", spades),
          testCard("J", hearts),
          testCard("9", diamonds),
          testCard("6", clubs),
          testCard("3", spades)
        ],
        "High Card"
      ],
      [
        "One Pair",
        [
          testCard("Q", spades),
          testCard("Q", hearts),
          testCard("9", diamonds),
          testCard("6", clubs),
          testCard("3", spades)
        ],
        "One Pair"
      ],
      [
        "Two Pair",
        [
          testCard("Q", spades),
          testCard("Q", hearts),
          testCard("6", diamonds),
          testCard("6", clubs),
          testCard("3", spades)
        ],
        "Two Pair"
      ],
      [
        "Three of a Kind",
        [
          testCard("8", spades),
          testCard("8", hearts),
          testCard("8", diamonds),
          testCard("K", clubs),
          testCard("3", spades)
        ],
        "Three of a Kind"
      ],
      [
        "Five-high Straight",
        [
          testCard("A", spades),
          testCard("2", hearts),
          testCard("3", diamonds),
          testCard("4", clubs),
          testCard("5", spades)
        ],
        "Straight"
      ],
      [
        "Flush",
        [
          testCard("A", hearts),
          testCard("J", hearts),
          testCard("8", hearts),
          testCard("4", hearts),
          testCard("2", hearts)
        ],
        "Flush"
      ],
      [
        "Full House",
        [
          testCard("K", spades),
          testCard("K", hearts),
          testCard("K", diamonds),
          testCard("4", clubs),
          testCard("4", spades)
        ],
        "Full House"
      ],
      [
        "Four of a Kind",
        [
          testCard("7", spades),
          testCard("7", hearts),
          testCard("7", diamonds),
          testCard("7", clubs),
          testCard("A", spades)
        ],
        "Four of a Kind"
      ],
      [
        "Straight Flush",
        [
          testCard("9", spades),
          testCard("10", spades),
          testCard("J", spades),
          testCard("Q", spades),
          testCard("K", spades)
        ],
        "Straight Flush"
      ]
    ];

    const results = testCases.map(
      function (testCase) {
        const actual = evaluateFive(
          testCase[1]
        ).categoryName;

        return {
          test: testCase[0],
          expected: testCase[2],
          actual: actual,
          passed: actual === testCase[2]
        };
      }
    );

    const bestOfSeven = evaluateSeven([
      testCard("A", spades),
      testCard("A", hearts),
      testCard("K", diamonds),
      testCard("K", clubs),
      testCard("K", spades),
      testCard("2", hearts),
      testCard("3", diamonds)
    ]);

    results.push({
      test: "Best five of seven",
      expected: "Full House",
      actual: bestOfSeven.categoryName,
      passed:
        bestOfSeven.categoryName ===
        "Full House"
    });

    return {
      passed: results.every(function (result) {
        return result.passed;
      }),
      results: results
    };
  }

  window.PokerEvaluator = {
    evaluateFive: evaluateFive,
    evaluateSeven: evaluateSeven,
    compareScores: compareScores,
    runTests: runTests
  };
})();
