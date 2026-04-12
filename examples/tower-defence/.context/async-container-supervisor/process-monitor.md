# Process Monitor

This guide explains how to use the {ruby Async::Container::Supervisor::ProcessMonitor} to log CPU and memory metrics for your worker processes.

## Overview

Understanding how your workers consume resources over time is essential for performance optimization, capacity planning, and debugging. Without visibility into CPU and memory usage, you can't identify bottlenecks, plan infrastructure scaling, or diagnose production issues effectively.

The `ProcessMonitor` provides this observability by periodically capturing and logging comprehensive metrics for your entire application process tree.

Use the `ProcessMonitor` when you need:

- **Performance analysis**: Identify which workers consume the most CPU or memory.
- **Capacity planning**: Determine optimal worker counts and memory requirements.
- **Trend monitoring**: Track resource usage patterns over time.
- **Debugging assistance**: Correlate resource usage with application behavior.
- **Cost optimization**: Right-size infrastructure based on actual usage.

Unlike the {ruby Async::Container::Supervisor::MemoryMonitor}, which takes action when limits are exceeded, the `ProcessMonitor` is purely observational - it logs metrics without interfering with worker processes.

## Usage

Add a process monitor to log resource usage every minute:

```ruby
service "supervisor" do
	include Async::Container::Supervisor::Environment
	
	monitors do
		[
			# Log CPU and memory metrics for all processes:
			Async::Container::Supervisor::ProcessMonitor.new(
				interval: 60  # Capture metrics every minute
			)
		]
	end
end
```

This allows you to easily search and filter by specific fields:
- `general.process_id = 12347` - Find metrics for a specific process.
- `general.command = "worker-1"` - Find all metrics for worker processes.
- `general.processor_utilization > 50` - Find high CPU usage processes.
- `general.resident_size > 500000` - Find processes using more than 500MB.

## Configuration Options

### `interval`

The interval (in seconds) at which to capture and log process metrics. Default: `60` seconds.

```ruby
# Log every 30 seconds
Async::Container::Supervisor::ProcessMonitor.new(interval: 30)

# Log every 5 minutes
Async::Container::Supervisor::ProcessMonitor.new(interval: 300)
```

## Captured Metrics

The `ProcessMonitor` captures the following metrics for each process:

### Core Metrics

- **process_id**: Unique identifier for the process.
- **parent_process_id**: The parent process that spawned this one.
- **process_group_id**: Process group identifier.
- **command**: The command name.
- **processor_utilization**: CPU usage percentage.
- **resident_size**: Physical memory used (KB).
- **total_size**: Total memory space including shared memory (KB).
- **processor_time**: Total CPU time used (seconds).
- **elapsed_time**: How long the process has been running (seconds).

### Detailed Memory Metrics

When available (OS-dependent), additional memory details are captured:

- **map_count**: Number of memory mappings (stacks, libraries, etc.).
- **proportional_size**: Memory usage accounting for shared memory (KB).
- **shared_clean_size**: Unmodified shared memory (KB).
- **shared_dirty_size**: Modified shared memory (KB).
- **private_clean_size**: Unmodified private memory (KB).
- **private_dirty_size**: Modified private memory (KB).
- **referenced_size**: Active page-cache (KB).
- **anonymous_size**: Memory not backed by files (KB)
- **swap_size**: Memory swapped to disk (KB).
- **proportional_swap_size**: Proportional swap usage (KB).
- **major_faults**: The number of page faults requiring I/O.
- **minor_faults**: The number of page faults that don't require I/O (e.g. CoW).
