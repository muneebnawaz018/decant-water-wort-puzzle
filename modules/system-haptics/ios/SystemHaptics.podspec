# Self-contained on purpose. Expo's own module podspecs read their version out
# of a sibling `package.json`; a local module under `modules/` has none, so the
# values are literal here rather than parsed from a file that does not exist.
Pod::Spec.new do |s|
  s.name           = 'SystemHaptics'
  s.version        = '0.1.0'
  s.summary        = 'Reads what the OS will say about vibration'
  s.description    = 'Whether the device has haptic hardware, for the settings dialog'
  s.author         = 'Decant'
  s.homepage       = 'https://decant.app'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
