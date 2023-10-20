import client, { Counter, Gauge } from "prom-client";

export const register = new client.Registry();

export function registerCounter(name: string, help: string) {
  try {
    register.registerMetric(new client.Counter({ name, help }));
    return register.getSingleMetric(name) as Counter;
  } catch (error) {}
}

export function registerGauge(name: string, help: string) {
  try {
    register.registerMetric(new client.Gauge({ name, help }));
    return register.getSingleMetric(name) as Gauge;
  } catch (error) {}
}

// TO-DO: Add Prometheus metrics
// https://github.com/pinax-network/substreams-sink-clickhouse/issues/26
export const requests = registerCounter("requests", "Total requests");
export const registry = await register.metrics();
