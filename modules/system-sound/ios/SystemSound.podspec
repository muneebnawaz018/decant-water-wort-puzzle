# Self-contained on purpose, like the sibling modules: Expo's own podspecs read
# their version out of a package.json a local module does not have.
Pod::Spec.new do |s|
  s.name           = 'SystemSound'
  s.version        = '0.1.0'
  s.summary        = 'Game one-shots through AVAudioEngine'
  s.description    = 'Preloaded audio buffers with tape-style pitch, bypassing AVPlayer'
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
