/* Reino Pequeno for Windows: one .exe that carries the game (resource 101).
   It copies the game to %LOCALAPPDATA%\ReinoPequeno and opens it in its own window with Edge or Chrome
   (app mode, separate profile, so saved games and downloaded updates stay there). On the first run it offers
   to install: a copy of the program in that folder plus shortcuts on the Desktop and in the Start menu.
   Options: --so-extrair (only copy the game and print where), --teste-instalar (install without asking). */
#define UNICODE
#define _UNICODE
#define COBJMACROS
#include <windows.h>
#include <shlobj.h>
#include <shobjidl.h>
#include <objbase.h>
#include <stdio.h>
#include <wchar.h>

#define VERSAO L"@VERSION_NAME@"

static wchar_t dir[MAX_PATH], html[MAX_PATH], self[MAX_PATH];

static int exists(const wchar_t *p) { return GetFileAttributesW(p) != INVALID_FILE_ATTRIBUTES; }

static int readText(const wchar_t *p, wchar_t *out, int n) {
    HANDLE h = CreateFileW(p, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, 0, NULL);
    if (h == INVALID_HANDLE_VALUE) return 0;
    char b[256]; DWORD got = 0; ReadFile(h, b, sizeof b - 1, &got, NULL); CloseHandle(h); b[got] = 0;
    MultiByteToWideChar(CP_UTF8, 0, b, -1, out, n); return 1;
}
static int writeBytes(const wchar_t *p, const void *data, DWORD len) {
    wchar_t tmp[MAX_PATH]; swprintf(tmp, MAX_PATH, L"%ls.tmp", p);
    HANDLE h = CreateFileW(tmp, GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
    if (h == INVALID_HANDLE_VALUE) return 0;
    DWORD put = 0; BOOL ok = WriteFile(h, data, len, &put, NULL); CloseHandle(h);
    if (!ok || put != len) { DeleteFileW(tmp); return 0; }
    return MoveFileExW(tmp, p, MOVEFILE_REPLACE_EXISTING);
}
static void writeText(const wchar_t *p, const wchar_t *s) {
    char b[512]; int n = WideCharToMultiByte(CP_UTF8, 0, s, -1, b, sizeof b, NULL, NULL);
    if (n > 0) writeBytes(p, b, (DWORD)(n - 1));
}

/* the game inside the .exe goes to the data folder when it is missing or older */
static int extract(void) {
    wchar_t vf[MAX_PATH], old[64] = L"";
    swprintf(vf, MAX_PATH, L"%ls\\versao.txt", dir);
    readText(vf, old, 64);
    if (exists(html) && wcscmp(old, VERSAO) == 0) return 1;
    HRSRC r = FindResourceW(NULL, MAKEINTRESOURCEW(101), MAKEINTRESOURCEW(10));
    if (!r) return 0;
    HGLOBAL g = LoadResource(NULL, r); DWORD len = SizeofResource(NULL, r);
    if (!g || !len) return 0;
    if (!writeBytes(html, LockResource(g), len)) return 0;
    writeText(vf, VERSAO);
    return 1;
}

static void shortcut(const wchar_t *where, const wchar_t *target) {
    IShellLinkW *l = NULL; IPersistFile *f = NULL;
    if (FAILED(CoCreateInstance(&CLSID_ShellLink, NULL, CLSCTX_INPROC_SERVER, &IID_IShellLinkW, (void **)&l))) return;
    IShellLinkW_SetPath(l, target);
    IShellLinkW_SetWorkingDirectory(l, dir);
    IShellLinkW_SetDescription(l, L"Reino Pequeno - estratégia medieval");
    IShellLinkW_SetIconLocation(l, target, 0);
    if (SUCCEEDED(IShellLinkW_QueryInterface(l, &IID_IPersistFile, (void **)&f))) { IPersistFile_Save(f, where, TRUE); IPersistFile_Release(f); }
    IShellLinkW_Release(l);
}

static void install(void) {
    wchar_t exe[MAX_PATH], p[MAX_PATH], lnk[MAX_PATH];
    swprintf(exe, MAX_PATH, L"%ls\\Reino Pequeno.exe", dir);
    if (_wcsicmp(exe, self) != 0) CopyFileW(self, exe, FALSE);
    CoInitialize(NULL);
    if (SUCCEEDED(SHGetFolderPathW(NULL, CSIDL_DESKTOPDIRECTORY, NULL, 0, p))) { swprintf(lnk, MAX_PATH, L"%ls\\Reino Pequeno.lnk", p); shortcut(lnk, exe); }
    if (SUCCEEDED(SHGetFolderPathW(NULL, CSIDL_PROGRAMS, NULL, 0, p))) { swprintf(lnk, MAX_PATH, L"%ls\\Reino Pequeno.lnk", p); shortcut(lnk, exe); }
    CoUninitialize();
    wchar_t done[MAX_PATH]; swprintf(done, MAX_PATH, L"%ls\\instalado.txt", dir); writeText(done, VERSAO);
}

/* file:///C:/Users/João/... with every byte outside the safe set written as %XX (UTF-8) */
static void fileUrl(const wchar_t *path, wchar_t *out, int n) {
    char u8[MAX_PATH * 4], enc[MAX_PATH * 12]; int k = 0;
    WideCharToMultiByte(CP_UTF8, 0, path, -1, u8, sizeof u8, NULL, NULL);
    k += sprintf(enc + k, "file:///");
    for (unsigned char *c = (unsigned char *)u8; *c; c++) {
        unsigned char ch = *c == '\\' ? '/' : *c;
        if ((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || strchr("/:._-~", ch)) enc[k++] = ch;
        else k += sprintf(enc + k, "%%%02X", ch);
    }
    enc[k] = 0;
    MultiByteToWideChar(CP_UTF8, 0, enc, -1, out, n);
}

static int findBrowser(wchar_t *out) {
    const wchar_t *rel[] = {
        L"Microsoft\\Edge\\Application\\msedge.exe", L"Google\\Chrome\\Application\\chrome.exe",
        L"BraveSoftware\\Brave-Browser\\Application\\brave.exe", NULL };
    const int roots[] = { CSIDL_PROGRAM_FILESX86, CSIDL_PROGRAM_FILES, CSIDL_LOCAL_APPDATA };
    for (int i = 0; rel[i]; i++)
        for (int j = 0; j < 3; j++) {
            wchar_t base[MAX_PATH];
            if (FAILED(SHGetFolderPathW(NULL, roots[j], NULL, 0, base))) continue;
            swprintf(out, MAX_PATH, L"%ls\\%ls", base, rel[i]);
            if (exists(out)) return 1;
        }
    return 0;
}

int WINAPI wWinMain(HINSTANCE inst, HINSTANCE prev, PWSTR cmd, int show) {
    (void)inst; (void)prev; (void)show;
    wchar_t base[MAX_PATH];
    GetModuleFileNameW(NULL, self, MAX_PATH);
    if (FAILED(SHGetFolderPathW(NULL, CSIDL_LOCAL_APPDATA, NULL, 0, base))) GetTempPathW(MAX_PATH, base);
    swprintf(dir, MAX_PATH, L"%ls\\ReinoPequeno", base);
    CreateDirectoryW(dir, NULL);
    swprintf(html, MAX_PATH, L"%ls\\ReinoPequeno.html", dir);
    if (!extract()) {
        MessageBoxW(NULL, L"Não consegui preparar o jogo na pasta de dados (%LOCALAPPDATA%\\ReinoPequeno). Verifique o espaço em disco.", L"Reino Pequeno", MB_ICONERROR);
        return 1;
    }
    if (cmd && wcsstr(cmd, L"--so-extrair")) { wprintf(L"%ls\n", html); return 0; }
    wchar_t asked[MAX_PATH]; swprintf(asked, MAX_PATH, L"%ls\\perguntado.txt", dir);
    if (cmd && wcsstr(cmd, L"--teste-instalar")) { install(); return 0; }
    if (!exists(asked)) {
        writeText(asked, VERSAO);
        int r = MessageBoxW(NULL,
            L"Quer instalar o Reino Pequeno neste computador?\n\n"
            L"Sim: cria atalhos na Área de Trabalho e no menu Iniciar.\n"
            L"Não: só abre o jogo agora, sem instalar nada.\n\n"
            L"O jogo funciona sem internet. Os jogos salvos e as atualizações ficam em %LOCALAPPDATA%\\ReinoPequeno.",
            L"Reino Pequeno " VERSAO, MB_YESNO | MB_ICONQUESTION);
        if (r == IDYES) install();
    }
    wchar_t url[MAX_PATH * 12], br[MAX_PATH], args[MAX_PATH * 16];
    fileUrl(html, url, MAX_PATH * 12);
    if (findBrowser(br)) {
        swprintf(args, MAX_PATH * 16,
            L"\"%ls\" --app=\"%ls\" --user-data-dir=\"%ls\\navegador\" --no-first-run --no-default-browser-check "
            L"--window-size=1280,800 --autoplay-policy=no-user-gesture-required --disable-features=Translate",
            br, url, dir);
        STARTUPINFOW si; PROCESS_INFORMATION pi; ZeroMemory(&si, sizeof si); si.cb = sizeof si; ZeroMemory(&pi, sizeof pi);
        if (CreateProcessW(br, args, NULL, NULL, FALSE, 0, NULL, dir, &si, &pi)) { CloseHandle(pi.hThread); CloseHandle(pi.hProcess); return 0; }
    }
    if ((INT_PTR)ShellExecuteW(NULL, L"open", html, NULL, dir, SW_SHOWNORMAL) > 32) return 0;
    MessageBoxW(NULL, L"Não encontrei um navegador para abrir o jogo. Abra o arquivo ReinoPequeno.html da pasta %LOCALAPPDATA%\\ReinoPequeno.", L"Reino Pequeno", MB_ICONWARNING);
    return 1;
}
