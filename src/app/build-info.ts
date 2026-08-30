/** The commit and time this bundle was built from — shown so feedback can name a build. */
export const BUILD_INFO: { commit: string; builtAt: string } =
  typeof __BUILD_INFO__ !== 'undefined' ? __BUILD_INFO__ : { commit: 'dev', builtAt: 'not built' };
