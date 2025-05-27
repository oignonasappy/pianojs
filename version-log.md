# バージョン履歴

#### v1.0.2
行46の誤字を修正。  
ピアノ生成対象の探索を部分一致から`.piano`, `.piano-hover`, `.piano-play`の三対象に限定。  
複数のクラスが設定されている場合の不具合を修正。

#### v1.0.1
ファイル全体に対し`"use strict";`を追加。

## v1.0.0
初期バージョンであり、  
ピアノの種類は`.piano`, `.piano-hover`, `piano-play`をサポート。  
データ属性は`data-first`, `data-last`, `data-key-width`, `data-key-height`, `data-highlight`, `data-highlight-color`, `data-notename`, `data-key-signature`, `data-custom-notename`, `data-volume`, `data-duration`, `data-osc-type`, `data-tuning`をサポート。  
メソッドは`playNote()`, `playNoteAll()`, `playKeys()`, `playHighlighted()`, `sequencer()`をサポート。
