# 📦 题库包规范(PACK-SPEC)v1

> 一句话:**把任何知识整理成下面格式的 JS 文件,放进 `dynasty-quest/packs/`,游戏题库就变厚。**
> 朝代大冒险是「知识竞技场」,题库包是「弹药」——包越多,兄妹对战的知识面越广。

## 一、包文件长什么样

一个包 = 一个 JS 文件,放在 `dynasty-quest/packs/` 目录,文件名 `英文id-pack.js`:

```js
// packs/science-pack.js
window.QUESTION_PACKS = window.QUESTION_PACKS || [];
window.QUESTION_PACKS.push({
  id: "science",            // 英文唯一 id(与文件名对应)
  name: "科学常识包",        // 显示名
  icon: "🔬",               // 显示图标(一个 emoji)
  version: 1,               // 版本号,改了内容就 +1
  source: "人工整理 2026-10",// 来源说明(数据出处/整理人)
  questions: [
    // ...题目,见下
  ]
});
```

## 二、题目 schema(与游戏核心题库完全一致)

每道题 6 个必填字段 + 1 个可选字段:

```js
{
  dynasty: "汉",          // 必填:归属关卡,只能是 8 个值之一(见下)
  level: 1,               // 必填:1=🌱小学级  2=🌟进阶
  q: "东汉张衡发明的地震仪器叫什么?",   // 必填:题面
  options: ["司南", "地动仪", "浑天仪", "日晷"],  // 必填:恰好 4 个选项
  answer: 1,              // 必填:正确选项下标 0/1/2/3(对应 A/B/C/D)
  fact: "候风地动仪于公元132年制成,是世界最早的地震监测仪器。",  // 必填:答完展示的小知识
  tag: "科学"             // 可选:知识域标记(诗词/科学/地理…)
}
```

**dynasty 只能是这 8 个值**:`夏商周` `秦` `汉` `三国` `唐` `宋` `元` `明清`

知识挂到哪一关?按「这件事发生在哪个朝代」归类。举几个例子:

| 知识 | 归关 |
|:--|:--|
| 张衡地动仪、造纸术 | 汉 |
| 三顾茅庐、赤壁之战 | 三国 |
| 唐诗、武则天、长安城 | 唐 |
| 活字印刷、《清明上河图》 | 宋 |
| 郑和下西洋、故宫 | 明清 |

## 三、硬约束(校验器会逐条检查)

1. `dynasty` 必须是 8 关之一;`level` 只能是 1 或 2
2. `options` 恰好 4 项,均为非空字符串,互不相同
3. `answer` 是 0–3 的整数
4. `q`、`fact` 非空;同一包内 `q` 不得重复
5. 引号:题面里引用诗句/书名用中文引号「」,不要用会破坏 JS 字符串的英文引号

## 四、三步接入流程

```bash
# 1. 照上面的格式写草稿(纯 JSON 文件)
# 2. 校验并生成正式包(推荐,会报出所有问题):
#    在 kids-ai-lab 根目录运行(tools 在那里):
python3 tools/pack_builder.py 我的草稿.json
#    → 生成 dynasty-quest/packs/<id>-pack.js + 打印统计报告

# 3. 挂载:在 dynasty-quest/index.html 里加一行(仿照已有的 poems-pack 行):
#    <script src="packs/<id>-pack.js"></script>
#    刷新游戏即生效;以后不想用了,删掉这一行即可,游戏不受影响
```

> 已挂载的包会在大冒险「朝代时空之路」地图顶部显示图标角标和总题数。

## 五、动手示例:5 道题从收集到打包

假设我们收集了 5 条科学常识(来源:课本/百科),整理成草稿 `science-draft.json`:

```json
{
  "id": "science",
  "name": "科学常识包",
  "icon": "🔬",
  "source": "人工整理 2026-10",
  "questions": [
    { "dynasty": "汉", "level": 2, "q": "东汉张衡发明的地震仪器叫什么?",
      "options": ["司南", "地动仪", "浑天仪", "日晷"], "answer": 1,
      "fact": "候风地动仪于公元132年制成,是世界最早的地震监测仪器。" },
    { "dynasty": "宋", "level": 1, "q": "活字印刷术的发明者是?",
      "options": ["蔡伦", "毕昇", "沈括", "鲁班"], "answer": 1,
      "fact": "北宋毕昇发明泥活字,比欧洲早 400 多年。" }
  ]
}
```

运行 `python3 tools/pack_builder.py science-draft.json`,校验通过会输出:

```
✅ science 包构建成功:2 题
   关卡分布:汉 1 · 宋 1
   难度分布:🌱 1 · 🌟 1
→ 已写入 dynasty-quest/packs/science-pack.js
```

在 index.html 加 `<script src="packs/science-pack.js"></script>`,完成。

## 六、署名规则

- 使用开源数据(如 xixi-poem-game 的诗库、chinese-poetry)必须在其生成的包头部保留原项目名与 MIT 许可证声明(pack_builder 会自动处理 `source` 字段,写清楚出处即可)
- 人工整理的包,`source` 写「人工整理 + 日期 + 整理人」,孩子的包就写孩子的名字——这是他们的作品

## 七、参考实现

| 路径 | 说明 |
|:--|:--|
| `tools/pack_builder.py` | 通用打包校验器(草稿 JSON → 正式包) |
| `tools/build_poems_pack.py` | 诗词包生成器(展示「从结构化数据自动出题」的进阶玩法) |
| `dynasty-quest/packs/poems-pack.js` | 第一个正式包(约 300 题,数据来自 xixi,MIT) |
