# Getting Started

This guide explains how to get started with `memory`, a Ruby gem for profiling memory allocations in your applications.

## Installation

Add the gem to your project:

``` bash
$ bundle add memory
```

## Core Concepts

`memory` helps you understand where your Ruby application allocates memory and which allocations are retained (not garbage collected). It has several core concepts:

- A {ruby Memory::Sampler} which captures allocation data during code execution.
- A {ruby Memory::Report} which aggregates and presents allocation statistics.
- A {ruby Memory::Aggregate} which groups allocations by specific metrics (gem, file, class, etc.).

## Usage

The simplest way to profile memory allocations is using the `Memory.report` method:

``` ruby
require "memory"

# Profile a block of code:
report = Memory.report do
	# Your code here - e.g., process 1000 user records:
	users = []
	1000.times do |i|
		users << {id: i, name: "User #{i}", email: "user#{i}@example.com"}
	end
	
	# Process the data:
	users.each do |user|
		formatted = "#{user[:name]} <#{user[:email]}>"
	end
end

# Display the results:
report.print
```

This will output a detailed report showing:

- **Total Allocated**: All objects created during execution
- **Total Retained**: Objects that survived garbage collection
- **By Gem**: Memory usage grouped by gem/library
- **By File**: Memory usage grouped by source file
- **By Location**: Memory usage by specific file:line locations
- **By Class**: Memory usage by object class
- **Strings**: Special analysis of string allocations

### Understanding the Output

The report shows memory allocations in human-readable units (B, KiB, MiB, etc.):

```
# Retained Memory Profile

- Total Allocated: (1.50 MiB in 15234 allocations)
- Total Retained: (856.32 KiB in 8912 allocations)

## By Gem (856.32 KiB in 8912 allocations)

- (645.21 KiB in 6543 allocations)	my_app/lib
- (128.45 KiB in 1234 allocations)	activerecord-7.0.8
- (82.66 KiB in 1135 allocations)	activesupport-7.0.8
```

Each line shows:
- The memory consumed and number of allocations in that category
- The category name (gem, file, class, etc.)

### Manual Start/Stop

For more control, use the {ruby Memory::Sampler} directly:

``` ruby
require "memory"

sampler = Memory::Sampler.new

# Start profiling:
sampler.start

# Run your code:
items = []
10000.times do |i|
	items << "Item #{i}"
end

# Stop profiling:
sampler.stop

# Generate and print the report:
report = sampler.report
report.print
```

This approach is useful when:
- You need to profile specific sections of long-running code
- You want to control exactly when profiling begins and ends
- You're integrating with test frameworks or benchmarking tools

### Filtering Allocations

You can filter which allocations to track by providing a filter block to {ruby Memory::Sampler}:

``` ruby
# Only track String allocations from your application code:
sampler = Memory::Sampler.new do |klass, file|
	klass == String && file.include?("/lib/my_app/")
end

sampler.start
# Your code here
sampler.stop

report = sampler.report
report.print
```

The filter block receives:
- `klass`: The class of the allocated object
- `file`: The source file where the allocation occurred

Return `true` to include the allocation, `false` to exclude it.

### Persisting Results

For analyzing large applications or comparing runs over time, you can persist allocation data to disk:

``` ruby
sampler = Memory::Sampler.new

sampler.start
# Run your code
sampler.stop

# Save the allocation data:
File.open("profile.mprof", "w", encoding: Encoding::BINARY) do |io|
	sampler.dump(io)
end
```

Later, you can load and analyze the data:

``` ruby
sampler = Memory::Sampler.new

# Load saved allocation data:
data = File.read("profile.mprof", encoding: Encoding::BINARY)
sampler.load(data)

# Generate a report:
report = sampler.report
report.print
```

You can even combine multiple profile files:

``` ruby
sampler = Memory::Sampler.new

# Load multiple profile files:
Dir.glob("profiles/*.mprof") do |path|
	puts "Loading #{path}..."
	sampler.load(File.read(path, encoding: Encoding::BINARY))
end

# Generate a combined report:
report = sampler.report
report.print
```

This is particularly useful for:
- **Profiling test suites**: Profile each test file separately, then combine results
- **Production analysis**: Capture profiles from production environments and analyze offline
- **Trend analysis**: Compare memory usage across different code versions

### Custom Reports

You can create custom reports with specific aggregates:

``` ruby
require "memory"

# Create a custom report with only specific aggregates:
report = Memory::Report.new([
	Memory::Aggregate.new("By Class", &:class_name),
	Memory::Aggregate.new("By Gem", &:gem)
], retained_only: true)

sampler = Memory::Sampler.new
sampler.run do
	# Your code here
	10000.times{"test string"}
end

# Add samples to the custom report:
report.add(sampler)
report.print
```

The `retained_only: true` option (default) focuses on memory leaks by only showing allocations that weren't garbage collected. Set it to `false` to see all allocations:

``` ruby
# Show all allocations, not just retained ones:
report = Memory::Report.new([
	Memory::Aggregate.new("By Class", &:class_name)
], retained_only: false)
```

### Exporting to JSON

Reports can be exported as JSON for integration with other tools:

``` ruby
report = Memory.report do
	# Your code
	data = Array.new(1000){{value: rand(1000)}}
end

# Export as JSON:
json_output = report.to_json
puts json_output

# Or as a Ruby hash:
hash_output = report.as_json
```

This is useful for:
- Building custom visualization tools.
- Integrating with CI/CD pipelines.
- Tracking memory metrics over time in dashboards.
