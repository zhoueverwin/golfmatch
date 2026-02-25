/**
 * Expo config plugin to fix Firebase build errors with Expo SDK 54.
 *
 * Firebase iOS SDK uses non-modular header imports which cause Xcode build
 * failures when combined with Expo's framework-based module setup.
 * This sets the CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES flag
 * to YES in the Xcode project build settings to work around the issue.
 */
const { withXcodeProject } = require("expo/config-plugins");

const withFirebaseFix = (config) => {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const buildConfigurations = project.pbxXCBuildConfigurationSection();

    for (const key in buildConfigurations) {
      const buildConfig = buildConfigurations[key];
      if (
        typeof buildConfig === "object" &&
        buildConfig.buildSettings
      ) {
        buildConfig.buildSettings.CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = "YES";
      }
    }

    return config;
  });
};

module.exports = withFirebaseFix;
