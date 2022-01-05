export default async () => {
  const [major, minor, patch] = Deno.version.deno.split(".");

  if (parseInt(major) < 1 || parseInt(minor) < 17 || parseInt(patch) < 0) {
    console.warn(
      `WARN: Sola requires Deno 1.17.0 or later (found deno ${major}.${minor}.${patch})`
    );
  }

  let hrtimePerm = (await Deno.permissions.query({ name: "hrtime" })).state;

  if (hrtimePerm === "prompt") {
    hrtimePerm = (await Deno.permissions.request({ name: "hrtime" })).state;
  }

  if (hrtimePerm === "denied") {
    console.warn(
      `WARN: hrtime permission missing. Time measurements will be incorrect (try the --allow-hrtime flag on compile.ts)`
    );
  }

};
