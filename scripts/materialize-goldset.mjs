#!/usr/bin/env node
const fs=require("fs");const path=require("path");
const root=path.join(__dirname,"..");
const dir=path.join(root,"docs/quality/_restore");
const meta=JSON.parse(fs.readFileSync(path.join(dir,"maf-goldset-meta.json"),"utf8"));
const parts=[0,1,2].map(i=>JSON.parse(fs.readFileSync(path.join(dir,`maf-goldset-part${i}.json`),"utf8")));
const items=parts.flat();
const out={...meta,itemCount:items.length,items};
const dest=path.join(root,"docs/quality/maf-goldset-phase-a.json");
fs.writeFileSync(dest, JSON.stringify(out));
console.log("materialized", items.length);
