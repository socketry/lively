# Released under the MIT License.
# Copyright, 2025, by Samuel Williams.

require 'zlib'

module PNG
	def self.greyscale(width, height, data)
		# PNG file signature
		png_signature = "\x89PNG\r\n\x1a\n".b

		# IHDR chunk
		bit_depth = 8  # 8 bits per pixel
		color_type = 0  # Greyscale
		compression_method = 0
		filter_method = 0
		interlace_method = 0

		ihdr_data = [width, height, bit_depth, color_type, compression_method, filter_method, interlace_method].pack('N2C5')
		ihdr_crc = Zlib.crc32("IHDR" + ihdr_data)
		ihdr_chunk = [ihdr_data.bytesize].pack('N') + "IHDR" + ihdr_data + [ihdr_crc].pack('N')

		# IDAT chunk
		raw_data = ""
		height.times do |y|
			row = data.get_string(y * width, width)
			raw_data << "\x00" + row
		end

		# Compress data with no compression (just to fit PNG structure)
		compressed_data = Zlib::Deflate.deflate(raw_data, Zlib::NO_COMPRESSION)
		idat_crc = Zlib.crc32("IDAT" + compressed_data)
		idat_chunk = [compressed_data.bytesize].pack('N') + "IDAT" + compressed_data + [idat_crc].pack('N')

		# IEND chunk
		iend_crc = Zlib.crc32("IEND")
		iend_chunk = [0].pack('N') + "IEND" + [iend_crc].pack('N')

		# Combine all parts into the final PNG
		return png_signature + ihdr_chunk + idat_chunk + iend_chunk
	end
end
