import { device, expect, element, by, waitFor } from "detox";

type GenderId = "male" | "female" | "other" | "unknown";

const POSSIBLE_GENDERS: GenderId[] = ["male", "female", "other", "unknown"];

const determineViewerGender = async (rootPrefix: string): Promise<GenderId> => {
  for (const gender of POSSIBLE_GENDERS) {
    const rootElement = element(by.id(`${rootPrefix}.${gender}`));
    try {
      await waitFor(rootElement).toBeVisible().withTimeout(2000);
      return gender;
    } catch (error) {
      // Ignore and continue to next gender option
    }
  }

  return "unknown";
};

const getOppositeGender = (gender: GenderId): GenderId => {
  if (gender === "male") return "female";
  if (gender === "female") return "male";
  return "unknown";
};

const expectCardsToMatchGender = async (
  listPrefix: string,
  expectedGender: GenderId,
  viewerGender: GenderId,
) => {
  if (expectedGender === "unknown") {
    // When expected gender is unknown, ensure viewer gender cards are absent at least
    await expect(
      element(by.id(`${listPrefix}.0.${viewerGender}`)),
    ).not.toExist();
    return;
  }

  // Check first three cards for expected gender and absence of viewer gender
  for (let index = 0; index < 3; index++) {
    const expectedCard = element(by.id(`${listPrefix}.${index}.${expectedGender}`));
    await waitFor(expectedCard).toBeVisible().withTimeout(10000);

    if (viewerGender !== "unknown") {
      await expect(
        element(by.id(`${listPrefix}.${index}.${viewerGender}`)),
      ).not.toExist();
    }
  }
};

describe("Gender Filtering", () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  it("shows only opposite-gender profiles in Search results", async () => {
    await element(by.id("TAB.SEARCH")).tap();

    const viewerGender = await determineViewerGender("SEARCH_SCREEN.ROOT");
    const expectedGender = getOppositeGender(viewerGender);

    await waitFor(
      element(by.id(`SEARCH_SCREEN.RESULT_LIST.${viewerGender || "unknown"}`)),
    )
      .toBeVisible()
      .withTimeout(10000);

    await expectCardsToMatchGender(
      "SEARCH_SCREEN.CARD",
      expectedGender,
      viewerGender,
    );
  });

  it("retains opposite-gender filtering after refresh", async () => {
    await element(by.id("TAB.SEARCH")).tap();

    const viewerGender = await determineViewerGender("SEARCH_SCREEN.ROOT");
    const expectedGender = getOppositeGender(viewerGender);

    const resultsList = element(
      by.id(`SEARCH_SCREEN.RESULT_LIST.${viewerGender || "unknown"}`),
    );
    await waitFor(resultsList).toBeVisible().withTimeout(10000);

    // Trigger pull-to-refresh by swiping down
    await resultsList.swipe("down", "fast", 0.7);

    await waitFor(resultsList).toBeVisible().withTimeout(10000);

    await expectCardsToMatchGender(
      "SEARCH_SCREEN.CARD",
      expectedGender,
      viewerGender,
    );
  });
});

