import { run, bench, group, baseline } from 'mitata';

const passwordHash = "$argon2id$v=19$m=65536,t=2,p=1$53yGw9x/71TwPK/jEX056kYMTLq+DIFAkCg2wIo+N7A$VGxk8EPwP8sLib1NDoo9YNh1eKLNCr2sy3uZywh5ayk";

group('argon2', () => {
    baseline('baseline', () => {});
    bench('Bun.password.verifySync', () => Bun.password.verifySync("password", passwordHash));
});

await run({
    avg: true, // enable/disable avg column (default: true)
    json: false, // enable/disable json output (default: false)
    colors: true, // enable/disable colors (default: true)
    min_max: true, // enable/disable min/max column (default: true)
    collect: false, // enable/disable collecting returned values into an array during the benchmark (default: false)
    percentiles: false, // enable/disable percentiles column (default: true)
});