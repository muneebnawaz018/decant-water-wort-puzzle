import AVFoundation
import ExpoModulesCore

/**
 * Game one-shots through `AVAudioEngine`, and the reason this module exists at
 * all: it is **not** `AVPlayer`.
 *
 * `expo-audio` wraps `AVPlayer`, which is a streaming-media pipeline — and on
 * the iOS 26 simulator that pipeline never finishes loading a local file. The
 * player sits at `isLoaded=false, duration=0` forever and `FigFilePlayer`
 * signals `err=-12864` at the render stage, on files the same build plays fine
 * on an iOS 18 simulator. A puzzle game's five one-shots never needed a
 * streaming pipeline in the first place; they need what games use.
 *
 * `AVAudioEngine` is that: buffers decoded once at load, played from memory
 * with no per-play I/O. It has shipped in iOS since version 8, so every iPhone
 * the app can install on can run this.
 *
 * Each cue owns a chain: `AVAudioPlayerNode → AVAudioUnitVarispeed → mixer`.
 * Varispeed is the tape model — rate and pitch move together — which is
 * exactly what the pour wants: `src/audio/pitch.ts` maps destination fill to a
 * rate, and a fuller vial sounds higher. One player node per cue also gives
 * the retrigger rule the JS side documents: firing a cue cuts itself off,
 * different cues overlap.
 *
 * The audio session is `.playback` with `.mixWithOthers`: sounds play over the
 * silent switch — the in-app Sound toggle is the one that decides, and it is
 * the only one that can — and never pause anyone's podcast.
 */
public class SystemSoundModule: Module {
  private let engine = AVAudioEngine()
  private var chains:
    [String: (player: AVAudioPlayerNode, varispeed: AVAudioUnitVarispeed, buffer: AVAudioPCMBuffer)] =
    [:]
  private var sessionConfigured = false

  private func configureSession() {
    if sessionConfigured { return }
    sessionConfigured = true
    let session = AVAudioSession.sharedInstance()
    try? session.setCategory(.playback, options: [.mixWithOthers])
    try? session.setActive(true)
  }

  public func definition() -> ModuleDefinition {
    Name("SystemSound")

    /**
     * Decode one file into a buffer and build its chain. Idempotent per key.
     *
     * Synchronous and cheap — the five cues total well under a second of
     * mono audio — and returning a Bool rather than throwing keeps the JS
     * side's rule that a device that cannot load a sound plays the game
     * silently rather than crashing.
     */
    Function("load") { (key: String, path: String) -> Bool in
      if self.chains[key] != nil { return true }

      do {
        self.configureSession()
        let file = try AVAudioFile(forReading: URL(fileURLWithPath: path))
        guard
          let buffer = AVAudioPCMBuffer(
            pcmFormat: file.processingFormat,
            frameCapacity: AVAudioFrameCount(file.length)
          )
        else { return false }
        try file.read(into: buffer)

        let player = AVAudioPlayerNode()
        let varispeed = AVAudioUnitVarispeed()
        self.engine.attach(player)
        self.engine.attach(varispeed)
        self.engine.connect(player, to: varispeed, format: buffer.format)
        self.engine.connect(varispeed, to: self.engine.mainMixerNode, format: buffer.format)

        self.chains[key] = (player, varispeed, buffer)
        return true
      } catch {
        return false
      }
    }

    /**
     * Fire a cue from the top. Unknown keys and a refusing engine are both
     * silent no-ops, for the same reason `load` returns false instead of
     * throwing.
     *
     * The engine is started lazily here rather than at load, and re-started
     * if something — an interruption, a route change — stopped it since.
     */
    Function("play") { (key: String, rate: Double, volume: Double) in
      guard let chain = self.chains[key] else { return }

      if !self.engine.isRunning {
        do { try self.engine.start() } catch { return }
      }

      chain.varispeed.rate = Float(rate)
      chain.player.volume = Float(volume)
      chain.player.stop()
      chain.player.scheduleBuffer(chain.buffer, at: nil, options: [], completionHandler: nil)
      chain.player.play()
    }
  }
}
