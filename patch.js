const fs = require('fs');
let code = fs.readFileSync('lib/transformations.ts', 'utf8');
code = code.replace(
`          label: {
            show: true,
            position: "right",
            formatter: (p) => Number(p.value).toFixed(1),
          },`,
`          label: {
            show: true,
            position: "right",
            formatter: (p) => Number(p.value).toFixed(1),
            color: theme.sankeyLabel,
            textBorderColor: "transparent",
          },`
);
fs.writeFileSync('lib/transformations.ts', code);
