import { CharacterLimitPlugin as LexicalCharacterLimitPlugin } from "@lexical/react/LexicalCharacterLimitPlugin"

export function CharacterLimitPlugin({
  maxLength,
  charset,
}: {
  maxLength: number
  charset: "UTF-8" | "UTF-16"
}) {
  return (
    <LexicalCharacterLimitPlugin
      maxLength={maxLength}
      charset={charset}
      renderer={(number) => (
        <div
          className={`px-1 text-xs ${number.remainingCharacters <= 0 ? "text-destructive" : "text-gray-500"}`}
        >
          {number.remainingCharacters}
        </div>
      )}
    />
  )
}
