import supabaseDataProvider from "../services/supabaseDataProvider";
import { ProfilesService } from "../services/supabase/profiles.service";

describe("SupabaseDataProvider gender filtering", () => {
  let prepareViewerContextSpy: jest.SpyInstance;
  let searchProfilesSpy: jest.SpyInstance;

  beforeEach(() => {
    prepareViewerContextSpy = jest.spyOn(
      supabaseDataProvider as any,
      "prepareViewerContext",
    );
    searchProfilesSpy = jest
      .spyOn(ProfilesService.prototype, "searchProfiles")
      .mockResolvedValue({ success: true, data: [] });
  });

  afterEach(() => {
    prepareViewerContextSpy.mockRestore();
    searchProfilesSpy.mockRestore();
  });

  it("applies opposite gender for getUsers when viewer is male", async () => {
    prepareViewerContextSpy.mockResolvedValue({
      profileId: "profile-123",
      gender: "male",
      oppositeGender: "female",
    });

    searchProfilesSpy.mockResolvedValue({ success: true, data: [] } as any);

    await supabaseDataProvider.getUsers({}, "recommended");

    expect(searchProfilesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ gender: "female" }),
      1,
      100,
      "recommended",
    );
  });

  it("keeps explicit gender filter when provided", async () => {
    prepareViewerContextSpy.mockResolvedValue({
      profileId: "profile-123",
      gender: "male",
      oppositeGender: "female",
    });

    searchProfilesSpy.mockResolvedValue({ success: true, data: [] } as any);

    await supabaseDataProvider.getUsers({ gender: "male" }, "registration");

    expect(searchProfilesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ gender: "male" }),
      1,
      100,
      "registration",
    );
  });

  it("omits gender filter when viewer gender unknown", async () => {
    prepareViewerContextSpy.mockResolvedValue({
      profileId: "profile-123",
      gender: null,
      oppositeGender: null,
    });

    searchProfilesSpy.mockResolvedValue({ success: true, data: [] } as any);

    await supabaseDataProvider.getUsers({}, "recommended");

    const callArgs = searchProfilesSpy.mock.calls[0][0];
    expect(callArgs.gender).toBeUndefined();
  });

  it("applies opposite gender for searchUsers as well", async () => {
    prepareViewerContextSpy.mockResolvedValue({
      profileId: "profile-123",
      gender: "female",
      oppositeGender: "male",
    });

    searchProfilesSpy.mockResolvedValue({ success: true, data: [] } as any);

    await supabaseDataProvider.searchUsers({}, 1, 20);

    expect(searchProfilesSpy).toHaveBeenCalledWith(
      expect.objectContaining({ gender: "male" }),
      1,
      20,
    );
  });
});

