package expo.modules.systemsound

import android.media.AudioAttributes
import android.media.SoundPool
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The Android half, on `SoundPool` — the platform's own answer to game
 * one-shots, in the SDK since API 1: samples decoded once at load, played from
 * memory with low latency, up to `maxStreams` at once.
 *
 * The play rate (0.5–2.0) resamples, so pitch and speed move together — the
 * same tape model as the iOS side's varispeed, which is what the pour's
 * fill-to-pitch mapping wants.
 *
 * `USAGE_GAME` attributes route through the media volume like every other
 * game. Six streams: five cues plus one spare, since the only overlap the JS
 * side produces is a pour ringing under a completion chime.
 */
class SystemSoundModule : Module() {
  private val pool: SoundPool by lazy {
    SoundPool.Builder()
      .setMaxStreams(6)
      .setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_GAME)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      .build()
  }

  private val ids = HashMap<String, Int>()
  private val ready = HashSet<Int>()

  override fun definition() = ModuleDefinition {
    Name("SystemSound")

    /**
     * `SoundPool.load` decodes in the background and playing an undecoded
     * sample is a silent no-op, so completion is tracked and `play` checks it.
     * The JS side primes at first layout, seconds before any cue can fire, so
     * the window where a sound is skipped is the app's first breath.
     */
    Function("load") { key: String, path: String ->
      if (!ids.containsKey(key)) {
        pool.setOnLoadCompleteListener { _, sampleId, status ->
          if (status == 0) ready.add(sampleId)
        }
        ids[key] = pool.load(path, 1)
      }
      true
    }

    Function("play") { key: String, rate: Double, volume: Double ->
      val id = ids[key] ?: return@Function
      if (!ready.contains(id)) return@Function
      val gain = volume.toFloat()
      pool.play(id, gain, gain, 1, 0, rate.toFloat())
    }
  }
}
