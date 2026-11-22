package it.fermiumsmp.status;

/**
 * Thread-safe rolling tracker for server TPS and MSPT (average, min, max),
 * aware of dedicated server {@code pause-when-empty-seconds} hibernation.
 */
public final class TickTracker {
	private static final int WINDOW = 100;
	private static final long PAUSED_THRESHOLD_MS = 5_000L;

	private final long[] ring = new long[WINDOW];
	private int cursor = 0;
	private int count = 0;
	private long startNano = 0L;
	private volatile long lastTickEpochMs = 0L;

	public record TickMetrics(double tps, double mspt, double msptMin, double msptMax) {
	}

	public synchronized void onTickStart() {
		startNano = System.nanoTime();
	}

	public synchronized void onTickEnd() {
		onTickEnd(System.currentTimeMillis());
	}

	public synchronized void onTickEnd(long nowEpochMs) {
		long endNano = System.nanoTime();
		if (startNano > 0L) {
			long duration = Math.max(0L, endNano - startNano);
			startNano = 0L;
			recordSample(duration, nowEpochMs);
		} else {
			lastTickEpochMs = nowEpochMs;
		}
	}

	public synchronized void recordSampleNanos(long durationNanos, long nowEpochMs) {
		recordSample(Math.max(0L, durationNanos), nowEpochMs);
	}

	private void recordSample(long durationNanos, long nowEpochMs) {
		if (durationNanos > 0L) {
			ring[cursor] = durationNanos;
			cursor = (cursor + 1) % WINDOW;
			if (count < WINDOW) {
				count++;
			}
		}
		lastTickEpochMs = nowEpochMs;
	}

	public synchronized TickMetrics compute(long[] mcTickTimesNanos, long nowEpochMs, boolean hasAnyPlayers) {
		if (!hasAnyPlayers && lastTickEpochMs > 0L && (nowEpochMs - lastTickEpochMs) >= PAUSED_THRESHOLD_MS) {
			return new TickMetrics(20.0, 0.0, 0.0, 0.0);
		}

		long sum = 0L;
		long min = Long.MAX_VALUE;
		long max = 0L;
		int samples = 0;

		if (mcTickTimesNanos != null) {
			for (long val : mcTickTimesNanos) {
				if (val > 0L) {
					sum += val;
					if (val < min) min = val;
					if (val > max) max = val;
					samples++;
				}
			}
		}

		if (samples == 0) {
			for (int i = 0; i < count; i++) {
				long val = ring[i];
				if (val > 0L) {
					sum += val;
					if (val < min) min = val;
					if (val > max) max = val;
					samples++;
				}
			}
		}

		if (samples == 0) {
			return new TickMetrics(20.0, 0.0, 0.0, 0.0);
		}

		double avgMs = clampDouble((sum / (double) samples) / 1_000_000.0, 0.0, 5000.0);
		double minMs = clampDouble(min / 1_000_000.0, 0.0, 5000.0);
		double maxMs = clampDouble(max / 1_000_000.0, 0.0, 5000.0);
		double tps = clampDouble(Math.min(20.0, 1000.0 / Math.max(50.0, avgMs)), 0.0, 20.0);

		return new TickMetrics(round2(tps), round2(avgMs), round2(minMs), round2(maxMs));
	}

	private static double clampDouble(double val, double min, double max) {
		if (!Double.isFinite(val)) return min;
		return Math.max(min, Math.min(max, val));
	}

	private static double round2(double val) {
		return Math.round(val * 100.0) / 100.0;
	}
}
