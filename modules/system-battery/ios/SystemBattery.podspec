Pod::Spec.new do |s|
  s.name           = 'SystemBattery'
  s.version        = '0.1.0'
  s.summary        = 'Battery level and power source, pushed from the OS.'
  s.description    = 'Local module. UIDevice on iOS, ACTION_BATTERY_CHANGED on Android.'
  s.author         = 'Decant'
  s.homepage       = 'https://github.com/decant'
  s.platforms      = { :ios => '15.1', :tvos => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
