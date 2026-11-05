import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import powershell from "highlight.js/lib/languages/powershell";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import ini from "highlight.js/lib/languages/ini";
import type { HLJSApi, Language } from "highlight.js";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("powershell", powershell);
hljs.registerLanguage("json", json);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("ini", ini);
hljs.registerAliases(["azure", "az", "sh", "shell", "zsh"], { languageName: "bash" });
hljs.registerAliases(["ps1", "pwsh"], { languageName: "powershell" });

const CISCO_KEYWORDS =
  "interface router ip ipv6 vlan switchport access-list access-group line vty crypto hostname enable no shutdown exit end configure terminal banner service username spanning-tree network passive-interface default-information encapsulation description duplex speed permit deny remark copy show ping traceroute debug write erase reload name trunk mode native allowed access portfast transport login password secret domain-name dns-server default-router pool excluded-address lease key version router-id area originate log ospf eigrp rip bgp nat dhcp";

hljs.registerLanguage("cisco", (h: HLJSApi): Language => ({
  name: "Cisco IOS",
  case_insensitive: true,
  keywords: { keyword: CISCO_KEYWORDS },
  contains: [
    h.COMMENT("^\\s*!", "$"),
    { className: "number", begin: /\b\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?\b/ },
    { className: "built_in", begin: /\b(?:Gi|Gig|GigabitEthernet|Fa|FastEthernet|Eth|Ethernet|Se|Serial|Vlan|Lo|Loopback|Po|Port-channel|Tu|Tunnel)\s?\d+(?:\/\d+)*(?:\.\d+)?/ },
    { className: "number", begin: /\b\d+\b/ },
    { className: "string", begin: /#[^#\n]*#/ },
  ],
}));

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function highlightCode(code: string, lang: string): string {
  const l = lang === "text" || !lang ? "" : lang;
  if (l && hljs.getLanguage(l)) {
    try {
      return hljs.highlight(code, { language: l, ignoreIllegals: true }).value;
    } catch { /* repli */ }
  }
  return esc(code);
}
