# SquadJS-BattleMetricsAPI

[![GitHub License](https://img.shields.io/github/license/magicoflolis/SquadJS-BattleMetricsAPI?style=flat-square)](https://github.com/magicoflolis/SquadJS-BattleMetricsAPI/blob/main/LICENSE)
[![GitHub Issues or Pull Requests](https://img.shields.io/github/issues/magicoflolis/SquadJS-BattleMetricsAPI?style=flat-square)](https://github.com/magicoflolis/SquadJS-BattleMetricsAPI/issues)

Connect your SquadJS instance to BattleMetrics using the [BattleMetrics API](https://www.battlemetrics.com/developers/documentation). For any issues, see [issue tracker](https://github.com/magicoflolis/SquadJS-BattleMetricsAPI/issues).

**Default `config.json`:**

_Be sure to add a `,` to the end of the connector before it._

```json
{
  "connectors": {
    "BattleMetrics": {
      "BanLists": [
        {
          "name": "Ban List Name",
          "listID": "Ban List ID",
          "UUID": "Ban List UUID"
        }
      ],
      "listID": "Ban List ID",
      "orgID": "Org ID",
      "serverID": "Server ID",
      "token": "BattleMetrics Token",
      "UUID": "BM"
    }
  }
}
```

## Pre-requirements

> **Token must not be limited by organization,** why? BattleMetrics tokens can be a bit _funky_...

- A BattleMetrics token.
  - Navigate to [Developer Area](https://www.battlemetrics.com/developers)
  - Select "New Token"
  - Give it a name at the top.
  - **Minimum:**
    - "Ban Lists"
    - "Bans"
    - "Player Notes"
  - **Recommended:**
    - "Ban Lists"
    - "Bans"
    - "Player Flags"
    - "Player Notes"
    - "RCON"
    - "Triggers"
  - If you are having trouble, toggle everything except "Account" or toggle that too if needed.
  - Why? BattleMetrics tokens can be a bit _funky_...

The connector can be used for anything BattleMetrics related, if you plan to do more than ban players or lookup players then toggle what you need.

## Connector Options

Anything with `?` at the end means it is **optional** and can be removed from the config.

**BanLists:**

> **If your going to use just one ban list, set BanLists to `[]`**

- `name?` - Name this ban list.
  - If removed `name` becomes this `listID`
- `listID` - Ban list ID
  - Select RCON > Bans > Ban List > View Bans > Look at that URL
  - That URL would be the listID `/rcon/bans/?filter[banList]=${ listID }`
- `UUID?` - When a ban is created, use this string at the start of the bans UUID
  - Useful when trying to identify SquadJS created bans.
  - Example: If `MYORG` is the UUID then all bans will begin with it, `MYORG990CE5576D3`
  - Defaults to global `UUID`
  - _UUIDs become capitalized during ban creation, do not include any special characters_
- `orgID?` - Org ID for specified ban list, **only use if token has access to that orgs ban list.**
  - Defaults to global `orgID`
- `serverID?` - Server ID for specified ban list, **only use if token has access to that orgs ban list.**
  - Defaults to global `serverID`

**Globals:**

- `listID` - Ban list ID
  - In BattleMetrics, select RCON > Bans > Ban List > View Bans > Look at that URL
  - That URL would be the listID `/rcon/bans/?filter[banList]=${ listID }`
- `orgID` - Org ID for the default ban list.
  - Select RCON > Orgs > "Select your Org" > Look at that URL
  - Example: `/rcon/orgs/edit/${ orgID }`
- `serverID` - Server ID for the default ban list.
  - Example: `/servers/squad/${ serverID }`
- `token` - Your BattleMetrics API token, see [Pre-requirements](#pre-requirements)
- `UUID` - When a ban is created, use this string at the start of the bans UUID
  - Useful when trying to identify SquadJS created bans.
  - Example: If `MYORG` is the UUID then all bans will begin with it, `MYORG990CE5576D3`
  - _UUIDs become capitalized during ban creation, do not include any special characters_
  - **To disable, set this to `""`**

## Install

- Copy n paste [config.json](./config.json) with your SquadJS config.
- In your SquadJS instance, replace `/squad-server/factory.js` with the one from this repo.
  - _If you have modified your `factory.js`, then manually add and import this connector._
- From this repo add `/squad-server/utils/battlemetrics-api.js` and `/squad-server/utils/battlemetrics-api.d.ts` to your `/squad-server/utils` directory.
  - `battlemetrics-api.d.ts` is used if you are going to create plugins or wanna know what each function does. Otherwise you can safetly ignore adding this file.

## Plugins

> I have also included a example plugin found in this repos `/squad-server/plugins` directory. Remove its `.txt` file extension. _Try not to enable it on a live SquadJS instance ❤️_

Plugins using this connector.

- [SquadJS-Watchdog](https://github.com/magicoflolis/SquadJS-Watchdog)
