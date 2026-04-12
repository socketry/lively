# Memory Monitor

This guide explains how to use the {ruby Async::Container::Supervisor::MemoryMonitor} to detect and restart workers that exceed memory limits or develop memory leaks.

## Overview

Long-running worker processes often accumulate memory over time, either through legitimate growth or memory leaks. Without intervention, workers can consume all available system memory, causing performance degradation or system crashes. The `MemoryMonitor` solves this by automatically detecting and restarting problematic workers before they impact system stability.

Use the `MemoryMonitor` when you need:

- **Memory leak protection**: Automatically restart workers that continuously accumulate memory.
- **Resource limits**: Enforce maximum memory usage per worker.
- **System stability**: Prevent runaway processes from exhausting system memory.
- **Leak diagnosis**: Capture memory samples when leaks are detected for debugging.

The monitor uses the `memory-leak` gem to track process memory usage over time, detecting abnormal growth patterns that indicate leaks.

## Usage

Add a memory monitor to your supervisor service to automatically restart workers that exceed 500MB:

```ruby
service "supervisor" do
	include Async::Container::Supervisor::Environment
	
	monitors do
		[
			Async::Container::Supervisor::MemoryMonitor.new(
				# Check worker memory every 10 seconds:
				interval: 10,
				
				# Restart workers exceeding 500MB:
				maximum_size_limit: 1024 * 1024 * 500
			)
		]
	end
end
```

When a worker exceeds the limit:
1. The monitor logs the leak detection.
2. Optionally captures a memory sample for debugging.
3. Sends `SIGINT` to gracefully shut down the worker.
4. The container automatically spawns a replacement worker.

## Configuration Options

The `MemoryMonitor` accepts the following options:

### `interval`

The interval (in seconds) at which to check for memory leaks. Default: `10` seconds.

```ruby
Async::Container::Supervisor::MemoryMonitor.new(interval: 30)
```

### `maximum_size_limit`

The maximum memory size (in bytes) per process. When a process exceeds this limit, it will be restarted.

```ruby
# 500MB limit
Async::Container::Supervisor::MemoryMonitor.new(maximum_size_limit: 1024 * 1024 * 500)

# 1GB limit
Async::Container::Supervisor::MemoryMonitor.new(maximum_size_limit: 1024 * 1024 * 1024)
```

### `total_size_limit`

The total size limit (in bytes) for all monitored processes combined. If not specified, only per-process limits are enforced.

```ruby
# Total limit of 2GB across all workers
Async::Container::Supervisor::MemoryMonitor.new(
	maximum_size_limit: 1024 * 1024 * 500,  # 500MB per process
	total_size_limit: 1024 * 1024 * 1024 * 2  # 2GB total
)
```

### `memory_sample`

Options for capturing memory samples when a leak is detected. If `nil`, memory sampling is disabled.

Default: `{duration: 30, timeout: 120}`

```ruby
# Customize memory sampling:
Async::Container::Supervisor::MemoryMonitor.new(
	memory_sample: {
		duration: 60,  # Sample for 60 seconds
		timeout: 180   # Timeout after 180 seconds
	}
)

# Disable memory sampling:
Async::Container::Supervisor::MemoryMonitor.new(
	memory_sample: nil
)
```

## Memory Leak Detection

When a memory leak is detected, the monitor will:

1. Log the leak detection with process details.
2. If `memory_sample` is configured, capture a memory sample from the worker.
3. Send a `SIGINT` signal to gracefully restart the worker.
4. The container will automatically restart the worker process.

### Memory Sampling

When a memory leak is detected and `memory_sample` is configured, the monitor requests a lightweight memory sample from the worker. This sample:

- Tracks allocations during the sampling period.
- Forces a garbage collection.
- Returns a JSON report showing retained objects.

The report includes:
- `total_allocated`: Total allocated memory and object count.
- `total_retained`: Total retained memory and count after GC.
- `by_gem`: Breakdown by gem/library.
- `by_file`: Breakdown by source file.
- `by_location`: Breakdown by specific file:line locations.
- `by_class`: Breakdown by object class.
- `strings`: String allocation analysis.

This is much more efficient than a full heap dump using `ObjectSpace.dump_all`.
