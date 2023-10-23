import client, { Counter, Gauge } from "prom-client";

export const registry = new client.Registry();

export function registerCounter(name: string, help: string) {
  try {
    registry.registerMetric(new client.Counter({ name, help }));
    return registry.getSingleMetric(name) as Counter;
  } catch (error) {}
}

export function registerGauge(name: string, help: string) {
  try {
    registry.registerMetric(new client.Gauge({ name, help }));
    return registry.getSingleMetric(name) as Gauge;
  } catch (error) {}
}

// TO-DO: Add Prometheus metrics
// https://github.com/pinax-network/substreams-sink-clickhouse/issues/26
export const sink_requests = registerCounter("sink_requests", "Total requests");
export const sink_request_errors = registerCounter("sink_request_errors", "Total failed requests");
export const queue_size = registerGauge("queue_size", "Amount of promises being processed");
export const entity_changes = registerCounter("entity_changes", "Total entity changes");
