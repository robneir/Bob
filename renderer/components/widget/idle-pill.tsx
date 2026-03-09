import React from 'react'
import { Minus, Mic, Plus, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const INSTALL_URLS: Record<string, string> = {
  claude: 'https://docs.anthropic.com/en/docs/claude-code/overview',
  openai: 'https://codex.openai.com',
  gemini: 'https://ai.google.dev/gemini-api/docs/ai-studio-quickstart',
  ollama: 'https://ollama.com/download',
}

// Official brand colors
const BRAND_COLORS: Record<string, string> = {
  claude: '#da7756',
  openai: '#e4e4e7',
  gemini: '#8B6FC0',
  ollama: '#e4e4e7',
}

function ClaudeLogo({ className, color }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill={color || 'currentColor'} className={className}>
      <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
    </svg>
  )
}

function OpenAILogo({ className, color }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill={color || 'currentColor'} className={className}>
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  )
}

function GeminiLogo({ className, color }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill={color || 'currentColor'} className={className}>
      <path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" />
    </svg>
  )
}

function OllamaLogo({ className, color }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill={color || 'currentColor'} className={className}>
      <path d="M16.361 10.26a.894.894 0 0 0-.558.47l-.072.148.001.207c0 .193.004.217.059.353.076.193.152.312.291.448.24.238.51.3.872.205a.86.86 0 0 0 .517-.436.752.752 0 0 0 .08-.498c-.064-.453-.33-.782-.724-.897a1.06 1.06 0 0 0-.466 0zm-9.203.005c-.305.096-.533.32-.65.639a1.187 1.187 0 0 0-.06.52c.057.309.31.59.598.667.362.095.632.033.872-.205.14-.136.215-.255.291-.448.055-.136.059-.16.059-.353l.001-.207-.072-.148a.894.894 0 0 0-.565-.472 1.02 1.02 0 0 0-.474.007Zm4.184 2c-.131.071-.223.25-.195.383.031.143.157.288.353.407.105.063.112.072.117.136.004.038-.01.146-.029.243-.02.094-.036.194-.036.222.002.074.07.195.143.253.064.052.076.054.255.059.164.005.198.001.264-.03.169-.082.212-.234.15-.525-.052-.243-.042-.28.087-.355.137-.08.281-.219.324-.314a.365.365 0 0 0-.175-.48.394.394 0 0 0-.181-.033c-.126 0-.207.03-.355.124l-.085.053-.053-.032c-.219-.13-.259-.145-.391-.143a.396.396 0 0 0-.193.032zm.39-2.195c-.373.036-.475.05-.654.086-.291.06-.68.195-.951.328-.94.46-1.589 1.226-1.787 2.114-.04.176-.045.234-.045.53 0 .294.005.357.043.524.264 1.16 1.332 2.017 2.714 2.173.3.033 1.596.033 1.896 0 1.11-.125 2.064-.727 2.493-1.571.114-.226.169-.372.22-.602.039-.167.044-.23.044-.523 0-.297-.005-.355-.045-.531-.288-1.29-1.539-2.304-3.072-2.497a6.873 6.873 0 0 0-.855-.031zm.645.937a3.283 3.283 0 0 1 1.44.514c.223.148.537.458.671.662.166.251.26.508.303.82.02.143.01.251-.043.482-.08.345-.332.705-.672.957a3.115 3.115 0 0 1-.689.348c-.382.122-.632.144-1.525.138-.582-.006-.686-.01-.853-.042-.57-.107-1.022-.334-1.35-.68-.264-.28-.385-.535-.45-.946-.03-.192.025-.509.137-.776.136-.326.488-.73.836-.963.403-.269.934-.46 1.422-.512.187-.02.586-.02.773-.002zm-5.503-11a1.653 1.653 0 0 0-.683.298C5.617.74 5.173 1.666 4.985 2.819c-.07.436-.119 1.04-.119 1.503 0 .544.064 1.24.155 1.721.02.107.031.202.023.208a8.12 8.12 0 0 1-.187.152 5.324 5.324 0 0 0-.949 1.02 5.49 5.49 0 0 0-.94 2.339 6.625 6.625 0 0 0-.023 1.357c.091.78.325 1.438.727 2.04l.13.195-.037.064c-.269.452-.498 1.105-.605 1.732-.084.496-.095.629-.095 1.294 0 .67.009.803.088 1.266.095.555.288 1.143.503 1.534.071.128.243.393.264.407.007.003-.014.067-.046.141a7.405 7.405 0 0 0-.548 1.873c-.062.417-.071.552-.071.991 0 .56.031.832.148 1.279L3.42 24h1.478l-.05-.091c-.297-.552-.325-1.575-.068-2.597.117-.472.25-.819.498-1.296l.148-.29v-.177c0-.165-.003-.184-.057-.293a.915.915 0 0 0-.194-.25 1.74 1.74 0 0 1-.385-.543c-.424-.92-.506-2.286-.208-3.451.124-.486.329-.918.544-1.154a.787.787 0 0 0 .223-.531c0-.195-.07-.355-.224-.522a3.136 3.136 0 0 1-.817-1.729c-.14-.96.114-2.005.69-2.834.563-.814 1.353-1.336 2.237-1.475.199-.033.57-.028.776.01.226.04.367.028.512-.041.179-.085.268-.19.374-.431.093-.215.165-.333.36-.576.234-.29.46-.489.822-.729.413-.27.884-.467 1.352-.561.17-.035.25-.04.569-.04.319 0 .398.005.569.04a4.07 4.07 0 0 1 1.914.997c.117.109.398.457.488.602.034.057.095.177.132.267.105.241.195.346.374.43.14.068.286.082.503.045.343-.058.607-.053.943.016 1.144.23 2.14 1.173 2.581 2.437.385 1.108.276 2.267-.296 3.153-.097.15-.193.27-.333.419-.301.322-.301.722-.001 1.053.493.539.801 1.866.708 3.036-.062.772-.26 1.463-.533 1.854a2.096 2.096 0 0 1-.224.258.916.916 0 0 0-.194.25c-.054.109-.057.128-.057.293v.178l.148.29c.248.476.38.823.498 1.295.253 1.008.231 2.01-.059 2.581a.845.845 0 0 0-.044.098c0 .006.329.009.732.009h.73l.02-.074.036-.134c.019-.076.057-.3.088-.516.029-.217.029-1.016 0-1.258-.11-.875-.295-1.57-.597-2.226-.032-.074-.053-.138-.046-.141.008-.005.057-.074.108-.152.376-.569.607-1.284.724-2.228.031-.26.031-1.378 0-1.628-.083-.645-.182-1.082-.348-1.525a6.083 6.083 0 0 0-.329-.7l-.038-.064.131-.194c.402-.604.636-1.262.727-2.04a6.625 6.625 0 0 0-.024-1.358 5.512 5.512 0 0 0-.939-2.339 5.325 5.325 0 0 0-.95-1.02 8.097 8.097 0 0 1-.186-.152.692.692 0 0 1 .023-.208c.208-1.087.201-2.443-.017-3.503-.19-.924-.535-1.658-.98-2.082-.354-.338-.716-.482-1.15-.455-.996.059-1.8 1.205-2.116 3.01a6.805 6.805 0 0 0-.097.726c0 .036-.007.066-.015.066a.96.96 0 0 1-.149-.078A4.857 4.857 0 0 0 12 3.03c-.832 0-1.687.243-2.456.698a.958.958 0 0 1-.148.078c-.008 0-.015-.03-.015-.066a6.71 6.71 0 0 0-.097-.725C8.997 1.392 8.337.319 7.46.048a2.096 2.096 0 0 0-.585-.041Zm.293 1.402c.248.197.523.759.682 1.388.03.113.06.244.069.292.007.047.026.152.041.233.067.365.098.76.102 1.24l.002.475-.12.175-.118.178h-.278c-.324 0-.646.041-.954.124l-.238.06c-.033.007-.038-.003-.057-.144a8.438 8.438 0 0 1 .016-2.323c.124-.788.413-1.501.696-1.711.067-.05.079-.049.157.013zm9.825-.012c.17.126.358.46.498.888.28.854.36 2.028.212 3.145-.019.14-.024.151-.057.144l-.238-.06a3.693 3.693 0 0 0-.954-.124h-.278l-.119-.178-.119-.175.002-.474c.004-.669.066-1.19.214-1.772.157-.623.434-1.185.68-1.382.078-.062.09-.063.159-.012z" />
    </svg>
  )
}

export function ProviderIcon({ provider, className }: { provider: string; className?: string }) {
  const color = BRAND_COLORS[provider]
  const cn = className || "h-3.5 w-3.5"

  switch (provider) {
    case 'claude':
      return <ClaudeLogo className={cn} color={color} />
    case 'openai':
      return <OpenAILogo className={cn} color={color} />
    case 'gemini':
      return <GeminiLogo className={cn} color={color} />
    case 'ollama':
      return <OllamaLogo className={cn} color={color} />
    default:
      return <Mic className={`${cn} text-muted-foreground`} />
  }
}

interface ProviderOption {
  id: string
  name: string
  installed: boolean
}

export type PillStatus = 'idle' | 'listening' | 'transcribing'

const PILL_SIZES = [
  { pill: 'px-3 py-2 gap-2.5', icon: 'h-5 w-5', alt: 'h-4 w-4', wave: 'h-5', bar: 'w-[3px]', dot: 'h-2 w-2' },
  { pill: 'px-3.5 py-2.5 gap-3', icon: 'h-6 w-6', alt: 'h-5 w-5', wave: 'h-6', bar: 'w-[3px]', dot: 'h-2.5 w-2.5' },
  { pill: 'px-4 py-3 gap-3', icon: 'h-8 w-8', alt: 'h-6 w-6', wave: 'h-8', bar: 'w-1', dot: 'h-3 w-3' },
  { pill: 'px-5 py-3.5 gap-3.5', icon: 'h-10 w-10', alt: 'h-7 w-7', wave: 'h-10', bar: 'w-1', dot: 'h-3.5 w-3.5' },
  { pill: 'px-6 py-4 gap-4', icon: 'h-12 w-12', alt: 'h-8 w-8', wave: 'h-12', bar: 'w-1.5', dot: 'h-4 w-4' },
  { pill: 'px-7 py-5 gap-5', icon: 'h-16 w-16', alt: 'h-10 w-10', wave: 'h-16', bar: 'w-1.5', dot: 'h-5 w-5' },
  { pill: 'px-8 py-6 gap-6', icon: 'h-20 w-20', alt: 'h-12 w-12', wave: 'h-20', bar: 'w-2', dot: 'h-6 w-6' },
  { pill: 'px-10 py-7 gap-7', icon: 'h-24 w-24', alt: 'h-14 w-14', wave: 'h-24', bar: 'w-2', dot: 'h-7 w-7' },
  { pill: 'px-12 py-8 gap-8', icon: 'h-32 w-32', alt: 'h-16 w-16', wave: 'h-32', bar: 'w-2.5', dot: 'h-8 w-8' },
  { pill: 'px-14 py-10 gap-10', icon: 'h-40 w-40', alt: 'h-20 w-20', wave: 'h-40', bar: 'w-3', dot: 'h-10 w-10' },
]

interface IdlePillProps {
  shortcutLabel?: string
  provider?: string
  providers?: ProviderOption[]
  onProviderChange?: (id: string) => void
  onClear?: () => void
  onSizeChange?: (size: number) => void
  ptyAlive?: boolean
  status?: PillStatus
  audioLevel?: number
  pillSize?: number
}

export default function IdlePill({
  shortcutLabel = 'Cmd + Shift + Space',
  provider = '',
  providers = [],
  onProviderChange,
  onClear,
  onSizeChange,
  ptyAlive = false,
  status = 'idle',
  audioLevel = 0,
  pillSize = 0,
}: IdlePillProps) {
  const others = providers.filter((p) => p.id !== provider)
  const sz = PILL_SIZES[pillSize] || PILL_SIZES[0]
  const brandColor = BRAND_COLORS[provider] || '#ef4444'
  const canGrow = pillSize < PILL_SIZES.length - 1
  const canShrink = pillSize > 0

  return (
    <div className="flex items-end gap-1.5">
      {/* Unified pill */}
      <div className="flex flex-col items-end">
        <motion.div
          className={`flex items-center rounded-full border ${sz.pill} shadow-[0_12px_32px_-16px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-colors cursor-grab active:cursor-grabbing overflow-hidden ${
            status === 'listening'
              ? 'bg-card/60'
              : status === 'transcribing'
              ? 'bg-card/60'
              : 'border-border/50 bg-card/60 hover:border-border/80 hover:bg-card/80'
          }`}
          style={{
            WebkitAppRegion: 'drag',
            ...(status === 'listening' ? { borderColor: `${brandColor}4D` } : {}),
            ...(status === 'transcribing' ? { borderColor: `${brandColor}4D` } : {}),
          } as React.CSSProperties}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {/* Provider icon — always visible */}
          <AnimatePresence mode="wait">
            <motion.div
              key={provider}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <ProviderIcon provider={provider} className={sz.icon} />
            </motion.div>
          </AnimatePresence>

          {/* Right side — animates between states */}
          <AnimatePresence mode="wait">
            {status === 'listening' ? (
              <motion.div
                key="listening"
                className="flex items-center gap-2"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <div className={`flex items-center gap-[3px] ${sz.wave}`}>
                  {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                    const base = 0.25
                    const boost = audioLevel * (0.8 + Math.sin(i * 1.2) * 0.4)
                    const scale = Math.min(base + boost * 2.5, 1)
                    return (
                      <motion.div
                        key={i}
                        className={`${sz.bar} rounded-full`}
                        animate={{ scaleY: scale }}
                        transition={{ duration: 0.1, ease: 'easeOut' }}
                        style={{ height: '100%', backgroundColor: brandColor }}
                      />
                    )
                  })}
                </div>
              </motion.div>
            ) : status === 'transcribing' ? (
              <motion.div
                key="transcribing"
                className="flex items-center gap-1"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className={`${sz.dot} rounded-full bg-primary`}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                className="flex items-center gap-2"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {/* Alternative LLM icons inside the pill */}
                {others.map((p) => (
                  <motion.button
                    key={p.id}
                    onClick={() => {
                      if (p.installed) {
                        onProviderChange?.(p.id)
                      } else {
                        window.bob?.openExternal(INSTALL_URLS[p.id] || '#')
                      }
                    }}
                    className="rounded-full p-0.5 transition-colors hover:bg-white/10 cursor-pointer"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                    title={p.installed ? p.name : `Install ${p.name}`}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ProviderIcon
                      provider={p.id}
                      className={`${sz.alt} ${p.installed ? 'opacity-35' : 'opacity-15'}`}
                    />
                  </motion.button>
                ))}
                {/* Clear context button — only shown when a session is active */}
                {ptyAlive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onClear?.()
                    }}
                    className="flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                    title="Clear session and start fresh"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    New
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Size controls — stacked vertically to the right, fixed size */}
      {status === 'idle' && (
        <motion.div
          className="flex flex-col items-center self-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={() => canGrow && onSizeChange?.(pillSize + 1)}
            className={`p-0.5 rounded transition-colors ${
              canGrow
                ? 'text-muted-foreground/40 hover:text-muted-foreground/80 cursor-pointer'
                : 'text-muted-foreground/15 cursor-default'
            }`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title="Increase pill size"
            disabled={!canGrow}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => canShrink && onSizeChange?.(pillSize - 1)}
            className={`p-0.5 rounded transition-colors ${
              canShrink
                ? 'text-muted-foreground/40 hover:text-muted-foreground/80 cursor-pointer'
                : 'text-muted-foreground/15 cursor-default'
            }`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title="Decrease pill size"
            disabled={!canShrink}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </div>
  )
}
