# frozen_string_literal: true

module RenderHelpers
  # Mock a simple DOM-like structure for testing render operations
  class MockElement
    attr_accessor :children, :id, :class_list, :style, :inner_html

    def initialize(id = nil)
      @id = id
      @children = []
      @class_list = []
      @style = {}
      @inner_html = ''
    end

    def appendChild(child)
      @children << child
    end

    def querySelector(selector)
      return self if selector == "##{@id}"
      @children.find { |child| child.querySelector(selector) }
    end

    def classList
      @class_list
    end

    def innerHTML=(html)
      @inner_html = html
    end

    def innerHTML
      @inner_html
    end
  end

  class MockCanvas
    attr_accessor :width, :height, :context

    def initialize(width = 800, height = 600)
      @width = width
      @height = height
      @context = MockCanvasContext.new
    end

    def getContext(type)
      @context
    end
  end

  class MockCanvasContext
    attr_accessor :fillStyle, :strokeStyle, :lineWidth, :operations

    def initialize
      @fillStyle = '#000000'
      @strokeStyle = '#000000'
      @lineWidth = 1
      @operations = []
    end

    def clearRect(x, y, width, height)
      @operations << { type: 'clearRect', x: x, y: y, width: width, height: height }
    end

    def fillRect(x, y, width, height)
      @operations << { type: 'fillRect', x: x, y: y, width: width, height: height }
    end

    def strokeRect(x, y, width, height)
      @operations << { type: 'strokeRect', x: x, y: y, width: width, height: height }
    end

    def beginPath
      @operations << { type: 'beginPath' }
    end

    def arc(x, y, radius, startAngle, endAngle)
      @operations << { type: 'arc', x: x, y: y, radius: radius, startAngle: startAngle, endAngle: endAngle }
    end

    def fill
      @operations << { type: 'fill' }
    end

    def stroke
      @operations << { type: 'stroke' }
    end
  end

  def mock_dom_element(id = 'test-element')
    MockElement.new(id)
  end

  def mock_canvas(width = 800, height = 600)
    MockCanvas.new(width, height)
  end

  def expect_render_operations(context, expected_operations)
    actual_types = context.operations.map { |op| op[:type] }
    expected_types = expected_operations.map { |op| op[:type] }
    
    expect(actual_types).to eq(expected_types)
    
    expected_operations.each_with_index do |expected_op, index|
      actual_op = context.operations[index]
      expected_op.each do |key, value|
        expect(actual_op[key]).to eq(value) if key != :type
      end
    end
  end
end

RSpec.configure do |config|
  config.include RenderHelpers
end