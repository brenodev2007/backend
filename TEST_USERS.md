# 🧪 Credenciais de Teste - Mercado Pago Sandbox

## 👤 Conta COMPRADOR (Buyer)
**Use esta conta para fazer login no checkout e comprar**

- **ID:** 3146018692
- **Usuário:** TESTUSER6292613730887217237
- **Email:** TESTUSER6292613730887217237@testuser.com
- **Senha:** jSMO5N6Tbz

---

## 🏪 Conta VENDEDOR (Seller)
**Conta do vendedor (para referência)**

- **ID:** 3134496343
- **Usuário:** TESTUSER6840012343686573677
- **Email:** TESTUSER6840012343686573677@testuser.com
- **Senha:** 0BAcGQy4uM

---

## ✅ Configurado no Sistema

O email do **COMPRADOR** já está configurado em:
```
MP_DEV_TEST_USER_EMAIL=TESTUSER6292613730887217237@testuser.com
```

---

## 🧪 Como Testar

### 1. Reinicie o backend
```bash
npm run dev
```

### 2. Crie um pagamento no app
- Clique em "Assinar Plano Pro"
- Você será redirecionado para o checkout sandbox

### 3. Faça login no checkout com:
- **Email/Usuário:** TESTUSER6292613730887217237 ou TESTUSER6292613730887217237@testuser.com
- **Senha:** jSMO5N6Tbz

### 4. Use um cartão de teste:
```
Número: 5031 4332 1540 6351
Nome: APRO
CPF: 12345678909
Validade: 11/25
CVV: 123
```

### 5. Confirme o pagamento
- ✅ Botão "Pagar" estará HABILITADO!
- ✅ Pagamento será APROVADO!
- ✅ Redirecionamento para `/payment/success`

---

## 🎯 Resultado Esperado

Com essas credenciais configuradas, o sistema vai:

1. ✅ Criar preferência com email de teste
2. ✅ Redirecionar para sandbox do MP
3. ✅ Permitir login com usuário de teste
4. ✅ Habilitar botão de pagamento
5. ✅ Aprovar pagamento com cartão de teste
6. ✅ Disparar webhook (se configurado)

**Agora deve funcionar perfeitamente!** 🎉
