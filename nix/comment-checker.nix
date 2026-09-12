# comment-checker, from the official GitHub release binary for this host's
# platform.
#
# Pinned to the exact release the hooks were last validated against. The
# SHA-256 sums are the ones GitHub reports for the release assets:
#
#   gh api repos/systemfsoftware/comment-checker/releases/tags/v<version> \
#     --jq '.assets[] | "\(.name) \(.digest)"'
#
# That answer is a fixed-output fetch, so a version bump moves the version and
# the four sums together — a sum that drifts from the URL fails the build
# loudly rather than reusing the previous store object.
{ lib, stdenv, stdenvNoCC, fetchurl, autoPatchelfHook }:

let
  version = "0.3.4";

  releases = {
    x86_64-linux = {
      target = "x86_64-unknown-linux-gnu";
      sha256 = "b61e934e3878a7661a1c8f661d8e280e2d0897c2d6673921c43c97093d6b5714";
    };
    aarch64-linux = {
      target = "aarch64-unknown-linux-gnu";
      sha256 = "9d38c0e3f82b874c60411e797cadbb38fac750b7afd4e889fc27f5118862e8a7";
    };
    x86_64-darwin = {
      target = "x86_64-apple-darwin";
      sha256 = "3673b553365293bd5ae594c2960e152da607c029b8f62eda57eb0e37a8a1de5f";
    };
    aarch64-darwin = {
      target = "aarch64-apple-darwin";
      sha256 = "e8dd56869cfa2466cfc32401226962b39929f9a7a6510c5922c5745edd14ad27";
    };
  };

  system = stdenvNoCC.hostPlatform.system;
  release = releases.${system} or (throw "comment-checker: no release binary pinned for ${system}");
in
stdenvNoCC.mkDerivation {
  pname = "comment-checker";
  inherit version;

  src = fetchurl {
    url = "https://github.com/systemfsoftware/comment-checker/releases/download/v${version}/comment-checker-${release.target}";
    inherit (release) sha256;
  };

  # The asset is one bare executable, so there is no directory to enter.
  dontUnpack = true;

  nativeBuildInputs = lib.optional stdenvNoCC.hostPlatform.isLinux autoPatchelfHook;
  # `stdenv.cc.cc.lib` supplies libgcc_s.so.1, which the Rust binaries link.
  buildInputs = lib.optionals stdenvNoCC.hostPlatform.isLinux [ stdenv.cc.cc.lib ];

  installPhase = ''
    runHook preInstall
    install -Dm755 "$src" "$out/bin/comment-checker"
    runHook postInstall
  '';

  meta = {
    description = "Claude Code PostToolUse hook that flags unnecessary comments";
    homepage = "https://github.com/systemfsoftware/comment-checker";
    license = lib.licenses.asl20;
    mainProgram = "comment-checker";
    platforms = lib.attrNames releases;
    sourceProvenance = [ lib.sourceTypes.binaryNativeCode ];
  };
}
