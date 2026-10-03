# 最终美术素材

使用内置 image_gen 工具生成并检查；最终需求：儿童动画风，保留经典奥特曼造型、明亮配色与帅气动作。没有将特摄照片作为最终角色发布。

- `sprites/ultra-atlas-v2.png`：四行三列，迪迦、赛罗、泰罗、初代，各有待机、格斗、光线姿势。透明背景。`heroes.js` 记录各图块裁切矩形和光线发射点。
- `sprites/city.png`：蓝色时分海边未来城市和开阔训练广场，无角色、无文字。
- `sprites/monster.png`：友好的青绿色小怪兽，站立与坐倒两种姿势，透明背景。

## 生成提示记录

角色初始提示：One production-ready 2D game sprite atlas, genuinely transparent background, regular 3 columns x 4 rows. Row 1 Ultraman Tiga, row 2 Ultraman Zero, row 3 Ultraman Taro, row 4 Original Ultraman. Recognizable canonical silver/red/purple or blue suit and helmet features, four-head-tall child-friendly heroes, professional Japanese children's animation cel shading. Column 1 ready stance facing right, column 2 rightward kick (Taro and Original punch), column 3 iconic forearm beam pose facing right with no beam. Full body, two arms and legs, no text, grid, floor or effects.

最终角色修订提示：Edit this game sprite atlas precisely. Keep all 12 characters, same 4 rows x 3 columns, same identities, same costumes, same poses and cel shaded style. Each character must be shrunk within its equal grid cell to fit a clean 10% transparent margin on all four sides. Separate Zero's feet from Taro's horns, and Taro's feet from Original Ultraman's fin. Center in each cell. Remove isolated floating marks and color fringe specks outside silhouettes. Preserve complete heads, fins, horns, hands and feet. Genuine alpha transparency, no text, grid, shadows or ground.

场景提示：Single 16:9 background for a child's Ultraman cartoon action game on iPad. Japanese children's 2D animation, clean cel-shaded shapes and subtle painterly texture. Cheerful futuristic coastal city at blue hour, luminous cobalt/turquoise and warm golden windows. Empty circular training plaza in bottom quarter. Uncluttered middle, distant buildings below halfway, small moon, no characters, text, UI, fire or destruction.

怪兽提示：One transparent sprite atlas with two equal columns. Same friendly teal dinosaur kaiju in both, Japanese children's animation style, clean outlines, pale mint tummy, gold rounded dorsal plates, small horns, expressive eyes and no sharp teeth. Left: standing facing left, arms raised. Right: funny surprised seated tumble, smiling, no injury. Full body, transparent padding, no text, floor, shadows or particles.

## Supplemental arcade artwork
Generated with OpenAI image generation using the existing hero atlas as reference: combat.png, four rows (Tiga, Zero, Taro, Original), four poses (punch, rising uppercut, crouched guard, roundhouse kick), transparent child-friendly classic suits. space.png: side-view silver orbital arena with blue planet, nebula and rings. canyon.png: side-view sunset sandstone arena, distant river and waterfalls. Both backgrounds have a clear flat foreground and no UI or characters. Effects are rendered procedurally in Canvas.
