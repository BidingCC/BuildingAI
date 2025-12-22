/**
 * Language icon utility functions
 * Returns the corresponding SVG icon based on language name
 * @author BuildingAI
 */

import AdaIcon from "../icons/ada.svg?raw";
import ApplescriptIcon from "../icons/apple.svg?raw";
import AssemblyIcon from "../icons/assembly.svg?raw";
import CIcon from "../icons/c.svg?raw";
import ClojureIcon from "../icons/clojure.svg?raw";
import CobolIcon from "../icons/cobol.svg?raw";
import CppIcon from "../icons/cpp.svg?raw";
import CrystalIcon from "../icons/crystal.svg?raw";
import CsharpIcon from "../icons/csharp.svg?raw";
import CssIcon from "../icons/css.svg?raw";
import DartIcon from "../icons/dart.svg?raw";
import DlangIcon from "../icons/dlang.svg?raw";
import DockerIcon from "../icons/docker.svg?raw";
import ElixirIcon from "../icons/elixir.svg?raw";
import ErlangIcon from "../icons/erlang.svg?raw";
import FortranIcon from "../icons/fortran.svg?raw";
import GoIcon from "../icons/go.svg?raw";
import GroovyIcon from "../icons/groovy.svg?raw";
import HaskellIcon from "../icons/haskell.svg?raw";
import HtmlIcon from "../icons/html.svg?raw";
import JavaIcon from "../icons/java.svg?raw";
import JsIcon from "../icons/javascript.svg?raw";
import JsxReactIcon from "../icons/javascript-react.svg?raw";
import JsonIcon from "../icons/json.svg?raw";
import JuliaIcon from "../icons/julia.svg?raw";
import KotlinIcon from "../icons/kotlin.svg?raw";
import LispIcon from "../icons/lisp.svg?raw";
import LuaIcon from "../icons/lua.svg?raw";
import MarkdownIcon from "../icons/markdown.svg?raw";
import MatlabIcon from "../icons/matlab.svg?raw";
import MermaidIcon from "../icons/mermaid.svg?raw";
import NimIcon from "../icons/nim.svg?raw";
import ObjectivecIcon from "../icons/objectivec.svg?raw";
import ObjectivecppIcon from "../icons/objectivecpp.svg?raw";
import OcamlIcon from "../icons/ocaml.svg?raw";
import PerlIcon from "../icons/perl.svg?raw";
import PhpIcon from "../icons/php.svg?raw";
import PrologIcon from "../icons/prolog.svg?raw";
import PythonIcon from "../icons/python.svg?raw";
import RIcon from "../icons/r.svg?raw";
import RubyIcon from "../icons/ruby.svg?raw";
import RustIcon from "../icons/rust.svg?raw";
import SassIcon from "../icons/sass.svg?raw";
import ScalaIcon from "../icons/scala.svg?raw";
import ShellIcon from "../icons/shell.svg?raw";
import SolidityIcon from "../icons/solidity.svg?raw";
import SqlIcon from "../icons/sql.svg?raw";
import SquareCodeIcon from "../icons/square-code.svg?raw";
import SvgIcon from "../icons/svg.svg?raw";
import SwiftIcon from "../icons/swift.svg?raw";
import TerraformIcon from "../icons/terraform.svg?raw";
import TextIcon from "../icons/text.svg?raw";
import TsIcon from "../icons/typescript.svg?raw";
import TsReactIcon from "../icons/typescript-react.svg?raw";
import VbnetIcon from "../icons/vbnet.svg?raw";
import VueIcon from "../icons/vue.svg?raw";
import XmlIcon from "../icons/xml.svg?raw";
import YamlIcon from "../icons/yaml.svg?raw";

/**
 * Get language icon
 * @param lang Language name
 * @returns Corresponding SVG icon string
 */
export function getLanguageIcon(lang: string): string {
    const normalizedLang = lang?.toLowerCase().trim() || "";

    switch (normalizedLang) {
        case "javascript":
        case "js":
            return JsIcon;
        case "typescript":
        case "ts":
            return TsIcon;
        case "jsx":
            return JsxReactIcon;
        case "tsx":
            return TsReactIcon;
        case "html":
            return HtmlIcon;
        case "css":
            return CssIcon;
        case "scss":
            return SassIcon;
        case "json":
            return JsonIcon;
        case "python":
        case "py":
            return PythonIcon;
        case "ruby":
        case "rb":
            return RubyIcon;
        case "go":
        case "golang":
            return GoIcon;
        case "r":
            return RIcon;
        case "java":
            return JavaIcon;
        case "kotlin":
        case "kt":
            return KotlinIcon;
        case "c":
            return CIcon;
        case "cpp":
        case "c++":
            return CppIcon;
        case "cs":
        case "csharp":
            return CsharpIcon;
        case "php":
            return PhpIcon;
        case "scala":
            return ScalaIcon;
        case "shell":
        case "sh":
        case "bash":
        case "zsh":
        case "powershell":
        case "ps1":
        case "bat":
        case "batch":
        case "shellscript":
            return ShellIcon;
        case "sql":
            return SqlIcon;
        case "yaml":
        case "yml":
            return YamlIcon;
        case "markdown":
        case "md":
            return MarkdownIcon;
        case "xml":
            return XmlIcon;
        case "rust":
        case "rs":
            return RustIcon;
        case "swift":
            return SwiftIcon;
        case "perl":
            return PerlIcon;
        case "lua":
            return LuaIcon;
        case "haskell":
            return HaskellIcon;
        case "erlang":
            return ErlangIcon;
        case "clojure":
            return ClojureIcon;
        case "vue":
            return VueIcon;
        case "svg":
            return SvgIcon;
        case "mermaid":
            return MermaidIcon;
        case "dart":
            return DartIcon;
        case "assembly":
            return AssemblyIcon;
        case "dockerfile":
            return DockerIcon;
        case "fortran":
            return FortranIcon;
        case "lisp":
            return LispIcon;
        case "ocaml":
            return OcamlIcon;
        case "prolog":
            return PrologIcon;
        case "groovy":
            return GroovyIcon;
        case "matlab":
            return MatlabIcon;
        case "cobol":
            return CobolIcon;
        case "ada":
            return AdaIcon;
        case "julia":
            return JuliaIcon;
        case "elixir":
            return ElixirIcon;
        case "vb.net":
            return VbnetIcon;
        case "nim":
            return NimIcon;
        case "crystal":
            return CrystalIcon;
        case "d":
            return DlangIcon;
        case "applescript":
            return ApplescriptIcon;
        case "solidity":
            return SolidityIcon;
        case "objectivec":
            return ObjectivecIcon;
        case "objectivecpp":
            return ObjectivecppIcon;
        case "terraform":
            return TerraformIcon;
        case "plain":
        case "text":
            return TextIcon;
        default:
            return SquareCodeIcon;
    }
}
