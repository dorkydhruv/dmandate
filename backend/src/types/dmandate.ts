/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/dmandate.json`.
 */
export type Dmandate = {
  address: "BXXJENjyLn4ZGYfkDpSxZ6Vt7TcxW7BQJgWaGiQGbfed";
  metadata: {
    name: "dmandate";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "cancelMandate";
      discriminator: [120, 234, 22, 247, 229, 124, 106, 149];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
          relations: ["mandate"];
        },
        {
          name: "token";
        },
        {
          name: "payerAta";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "payer";
              },
              {
                kind: "const";
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: "account";
                path: "token";
              }
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: "mandate";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [100, 109, 97, 110, 100, 97, 116, 101];
              },
              {
                kind: "account";
                path: "payer";
              },
              {
                kind: "account";
                path: "mandate.payee";
                account: "mandate";
              }
            ];
          };
        },
        {
          name: "payerUser";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [117, 115, 101, 114];
              },
              {
                kind: "account";
                path: "payer";
              }
            ];
          };
        },
        {
          name: "payeeUser";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [117, 115, 101, 114];
              },
              {
                kind: "account";
                path: "mandate.payee";
                account: "mandate";
              }
            ];
          };
        },
        {
          name: "tokenProgram";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [];
    },
    {
      name: "closePaymentHistory";
      discriminator: [205, 135, 156, 15, 233, 47, 225, 139];
      accounts: [
        {
          name: "authority";
          writable: true;
          signer: true;
        },
        {
          name: "mandate";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [100, 109, 97, 110, 100, 97, 116, 101];
              },
              {
                kind: "account";
                path: "mandate.payer";
                account: "mandate";
              },
              {
                kind: "account";
                path: "mandate.payee";
                account: "mandate";
              }
            ];
          };
        },
        {
          name: "paymentHistory";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  104,
                  105,
                  115,
                  116,
                  111,
                  114,
                  121
                ];
              },
              {
                kind: "account";
                path: "mandate";
              },
              {
                kind: "account";
                path: "payment_history.payment_number";
                account: "paymentHistory";
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [];
    },
    {
      name: "createMandate";
      discriminator: [230, 170, 158, 68, 33, 169, 16, 158];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "payee";
          writable: true;
        },
        {
          name: "token";
        },
        {
          name: "payerAta";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "payer";
              },
              {
                kind: "const";
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: "account";
                path: "token";
              }
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: "mandate";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [100, 109, 97, 110, 100, 97, 116, 101];
              },
              {
                kind: "account";
                path: "payer";
              },
              {
                kind: "account";
                path: "payee";
              }
            ];
          };
        },
        {
          name: "payerUser";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [117, 115, 101, 114];
              },
              {
                kind: "account";
                path: "payer";
              }
            ];
          };
        },
        {
          name: "payeeUser";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [117, 115, 101, 114];
              },
              {
                kind: "account";
                path: "payee";
              }
            ];
          };
        },
        {
          name: "tokenProgram";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        },
        {
          name: "frequency";
          type: "i64";
        },
        {
          name: "name";
          type: "string";
        },
        {
          name: "description";
          type: "string";
        }
      ];
    },
    {
      name: "executePayment";
      discriminator: [86, 4, 7, 7, 120, 139, 232, 139];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "payer";
          writable: true;
        },
        {
          name: "payerAta";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "payer";
              },
              {
                kind: "const";
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: "account";
                path: "token";
              }
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: "payee";
          writable: true;
        },
        {
          name: "mandate";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [100, 109, 97, 110, 100, 97, 116, 101];
              },
              {
                kind: "account";
                path: "mandate.payer";
                account: "mandate";
              },
              {
                kind: "account";
                path: "mandate.payee";
                account: "mandate";
              }
            ];
          };
        },
        {
          name: "paymentHistory";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  112,
                  97,
                  121,
                  109,
                  101,
                  110,
                  116,
                  95,
                  104,
                  105,
                  115,
                  116,
                  111,
                  114,
                  121
                ];
              },
              {
                kind: "account";
                path: "mandate";
              },
              {
                kind: "account";
                path: "mandate.payment_count";
                account: "mandate";
              }
            ];
          };
        },
        {
          name: "token";
        },
        {
          name: "payeeAta";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "payee";
              },
              {
                kind: "const";
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: "account";
                path: "token";
              }
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "tokenProgram";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [];
    },
    {
      name: "getUserSubscriptions";
      discriminator: [70, 242, 39, 146, 213, 249, 69, 204];
      accounts: [
        {
          name: "user";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [117, 115, 101, 114];
              },
              {
                kind: "account";
                path: "authority";
              }
            ];
          };
        },
        {
          name: "authority";
          signer: true;
          relations: ["user"];
        }
      ];
      args: [];
    },
    {
      name: "reapproveMandate";
      discriminator: [21, 185, 108, 213, 68, 12, 126, 23];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
          relations: ["mandate"];
        },
        {
          name: "token";
          relations: ["mandate"];
        },
        {
          name: "payerAta";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "payer";
              },
              {
                kind: "const";
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: "account";
                path: "token";
              }
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: "mandate";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [100, 109, 97, 110, 100, 97, 116, 101];
              },
              {
                kind: "account";
                path: "payer";
              },
              {
                kind: "account";
                path: "mandate.payee";
                account: "mandate";
              }
            ];
          };
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        }
      ];
    },
    {
      name: "registerUser";
      discriminator: [2, 241, 150, 223, 99, 214, 116, 97];
      accounts: [
        {
          name: "user";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [117, 115, 101, 114];
              },
              {
                kind: "account";
                path: "authority";
              }
            ];
          };
        },
        {
          name: "authority";
          writable: true;
          signer: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "name";
          type: "string";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "mandate";
      discriminator: [113, 216, 98, 159, 185, 63, 55, 18];
    },
    {
      name: "paymentHistory";
      discriminator: [138, 96, 137, 226, 234, 144, 123, 14];
    },
    {
      name: "user";
      discriminator: [159, 117, 95, 227, 239, 151, 58, 236];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "paymentTooEarly";
      msg: "Payment cannot be executed before the scheduled time";
    },
    {
      code: 6001;
      name: "unauthorized";
      msg: "Only the payer or payee can perform this operation";
    },
    {
      code: 6002;
      name: "invalidPaymentHistory";
      msg: "Invalid payment history for this mandate";
    },
    {
      code: 6003;
      name: "mandateInactive";
      msg: "The mandate is not active";
    },
    {
      code: 6004;
      name: "invalidAuthority";
      msg: "Invalid authority";
    },
    {
      code: 6005;
      name: "nameTooLong";
      msg: "Name too long";
    },
    {
      code: 6006;
      name: "descriptionTooLong";
      msg: "Description too long";
    },
    {
      code: 6007;
      name: "insufficientBalance";
      msg: "Insufficient token balance";
    }
  ];
  types: [
    {
      name: "mandate";
      type: {
        kind: "struct";
        fields: [
          {
            name: "payer";
            type: "pubkey";
          },
          {
            name: "payee";
            type: "pubkey";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "token";
            type: "pubkey";
          },
          {
            name: "frequency";
            type: "i64";
          },
          {
            name: "active";
            type: "bool";
          },
          {
            name: "nextPayout";
            type: "i64";
          },
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "name";
            type: "string";
          },
          {
            name: "description";
            type: "string";
          },
          {
            name: "paymentCount";
            type: "u32";
          }
        ];
      };
    },
    {
      name: "paymentHistory";
      type: {
        kind: "struct";
        fields: [
          {
            name: "mandate";
            docs: ["The mandate this payment belongs to"];
            type: "pubkey";
          },
          {
            name: "amount";
            docs: ["The payment amount"];
            type: "u64";
          },
          {
            name: "timestamp";
            docs: ["The timestamp when payment was executed"];
            type: "i64";
          },
          {
            name: "paymentNumber";
            docs: ["The payment sequence number"];
            type: "u32";
          },
          {
            name: "bump";
            docs: ["The bump seed for this PDA"];
            type: "u8";
          }
        ];
      };
    },
    {
      name: "user";
      type: {
        kind: "struct";
        fields: [
          {
            name: "authority";
            docs: ["The owner/authority of this user account"];
            type: "pubkey";
          },
          {
            name: "outgoingSubscriptionsCount";
            docs: ["Total number of active outgoing subscriptions (as payer)"];
            type: "u32";
          },
          {
            name: "incomingSubscriptionsCount";
            docs: ["Total number of active incoming subscriptions (as payee)"];
            type: "u32";
          },
          {
            name: "name";
            docs: ["Optional name for the user"];
            type: "string";
          },
          {
            name: "bump";
            docs: ["Bump seed for PDA derivation"];
            type: "u8";
          }
        ];
      };
    }
  ];
};
