/**
 * @file sockets.cpp
 * @brief CLEO UDP Sockets Plugin for GTA III.
 *
 * Exposes opcode 0B30 to stream real-time player telemetry and capture events, and opcode 0B31 to stream
 * script debug readings, over a non-blocking UDP datagram socket to localhost without game hitches.
 */

#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <stdio.h>

#pragma comment (lib, "III.CLEO.lib")
#pragma comment (lib, "ws2_32.lib")
#include "III.CLEO.h"

#define CLEO_VERSION_MAIN    2
#define CLEO_VERSION_MAJOR   1
#define CLEO_VERSION_MINOR   0

#define CLEO_VERSION ((CLEO_VERSION_MAIN << 24)|(CLEO_VERSION_MAJOR << 16)|(CLEO_VERSION_MINOR << 8))

/** Pointer to CLEO shared parameter buffer holding collected opcode arguments. */
static tScriptVar *Params;

/** Global non-blocking UDP socket handle used for outbound telemetry. */
static SOCKET g_udpSocket = INVALID_SOCKET;

/**
 * @brief Opcode 0B30: Transmit player telemetry or capture event via UDP.
 *
 * Script signature:
 *   0B30: port (int), x (float), y (float), z (float), heading (float), event (int)
 *
 * Formats and transmits a non-blocking UDP packet to 127.0.0.1:<port>:
 *   - event == 1: "CAPTURE:<x>,<y>,<z>,<h>"
 *   - event == 0: "POS:<x>,<y>,<z>,<h>"
 *
 * @param script Pointer to calling CScript thread context.
 * @return eOpcodeResult Execution status code (OR_CONTINUE to proceed).
 */
eOpcodeResult WINAPI OPCODE_0B30(CScript *script)
{
    // Collect 6 opcode parameters from the calling script's instruction pointer
    script->Collect(6);

    const int port = Params[0].nVar;
    const float x = Params[1].fVar;
    const float y = Params[2].fVar;
    const float z = Params[3].fVar;
    const float h = Params[4].fVar;
    const int eventType = Params[5].nVar;

    if (g_udpSocket != INVALID_SOCKET) {
        char buf[128];
        if (eventType == 1) {
            snprintf(buf, sizeof(buf), "CAPTURE:%.3f,%.3f,%.3f,%.2f", x, y, z, h);
        } else {
            snprintf(buf, sizeof(buf), "POS:%.3f,%.3f,%.3f,%.2f", x, y, z, h);
        }

        sockaddr_in dest;
        dest.sin_family = AF_INET;
        dest.sin_port = htons((unsigned short)port);
        dest.sin_addr.s_addr = htonl(INADDR_LOOPBACK); // 127.0.0.1

        sendto(g_udpSocket, buf, (int)strlen(buf), 0, (sockaddr*)&dest, sizeof(dest));
    }

    return OR_CONTINUE;
}

/** Debug channels a script can report on; a channel is a DEBUG_* constant from constants.txt. */
static const int MAX_DEBUG_CHANNELS = 256;

/** A value that has not changed is resent after this long, so a late-connecting listener catches up. */
static const DWORD DEBUG_RESEND_MS = 1000;

static bool g_debugSeen[MAX_DEBUG_CHANNELS];
static unsigned long g_debugLast[MAX_DEBUG_CHANNELS];
static DWORD g_debugSentAt[MAX_DEBUG_CHANNELS];
static int g_debugCount[MAX_DEBUG_CHANNELS];

/**
 * @brief Opcode 0B31: Transmit one debug reading via UDP.
 *
 * Script signature:
 *   0B31: port (int), channel (int), kind (int), value (int or float)
 *
 * Kinds and the packets they send to 127.0.0.1:<port>:
 *   - 0: "DBG:<channel>,i,<int>"    an int reading, sent when it changes or after DEBUG_RESEND_MS
 *   - 1: "DBG:<channel>,f,<float>"  a float reading, sent the same way
 *   - 2: "DBG:<channel>,c,<count>"  a counter the plugin increments on every call; value is ignored
 *   - 3: "DBG:<channel>,t,<int>"    a trace step, sent on every call so the listener sees the sequence
 *
 * @param script Pointer to calling CScript thread context.
 * @return eOpcodeResult Execution status code (OR_CONTINUE to proceed).
 */
eOpcodeResult WINAPI OPCODE_0B31(CScript *script)
{
    script->Collect(4);

    const int port = Params[0].nVar;
    const int channel = Params[1].nVar;
    const int kind = Params[2].nVar;
    const tScriptVar value = Params[3];

    if (g_udpSocket == INVALID_SOCKET || channel < 0 || channel >= MAX_DEBUG_CHANNELS) {
        return OR_CONTINUE;
    }

    char buf[64];
    if (kind == 2) {
        g_debugCount[channel]++;
        snprintf(buf, sizeof(buf), "DBG:%d,c,%d", channel, g_debugCount[channel]);
    } else if (kind == 3) {
        snprintf(buf, sizeof(buf), "DBG:%d,t,%d", channel, value.nVar);
    } else {
        const DWORD now = GetTickCount();
        if (g_debugSeen[channel] && g_debugLast[channel] == value.dVar &&
            now - g_debugSentAt[channel] < DEBUG_RESEND_MS) {
            return OR_CONTINUE;
        }
        g_debugSeen[channel] = true;
        g_debugLast[channel] = value.dVar;
        g_debugSentAt[channel] = now;
        if (kind == 1) {
            snprintf(buf, sizeof(buf), "DBG:%d,f,%.4f", channel, value.fVar);
        } else {
            snprintf(buf, sizeof(buf), "DBG:%d,i,%d", channel, value.nVar);
        }
    }

    sockaddr_in dest;
    dest.sin_family = AF_INET;
    dest.sin_port = htons((unsigned short)port);
    dest.sin_addr.s_addr = htonl(INADDR_LOOPBACK); // 127.0.0.1

    sendto(g_udpSocket, buf, (int)strlen(buf), 0, (sockaddr*)&dest, sizeof(dest));
    return OR_CONTINUE;
}

/**
 * @brief Standard Win32 DLL entry point for CLEO plugin lifecycle.
 *
 * - DLL_PROCESS_ATTACH: Verifies CLEO version, initializes WinSock2, sets the UDP socket
 *   to non-blocking mode (FIONBIO), resolves the CLEO param buffer, and registers opcodes 0B30 and 0B31.
 * - DLL_PROCESS_DETACH: Cleans up the UDP socket and shuts down WinSock.
 */
BOOL APIENTRY DllMain(HMODULE hModule, DWORD reason, LPVOID lpReserved)
{
    if (reason == DLL_PROCESS_ATTACH)
    {
        if (CLEO_GetVersion() < CLEO_VERSION)
        {
            return FALSE;
        }

        // Initialize WinSock2
        WSADATA wsa;
        if (WSAStartup(MAKEWORD(2, 2), &wsa) == 0)
        {
            g_udpSocket = socket(AF_INET, SOCK_DGRAM, IPPROTO_UDP);
            if (g_udpSocket != INVALID_SOCKET)
            {
                // Put socket into non-blocking mode so sendto never blocks the game loop
                u_long nonBlocking = 1;
                ioctlsocket(g_udpSocket, FIONBIO, &nonBlocking);
            }
        }

        // Cache shared parameter pointer and register opcode 0B30
        Params = CLEO_GetParamsAddress();
        Opcodes::RegisterOpcode(0x0B30, OPCODE_0B30);
        Opcodes::RegisterOpcode(0x0B31, OPCODE_0B31);
    }
    else if (reason == DLL_PROCESS_DETACH)
    {
        if (g_udpSocket != INVALID_SOCKET)
        {
            closesocket(g_udpSocket);
            g_udpSocket = INVALID_SOCKET;
        }
        WSACleanup();
    }
    return TRUE;
}
