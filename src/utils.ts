export function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export function now() {
    return Math.floor(new Date().getTime() / 1000);
}