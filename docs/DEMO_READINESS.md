# Demo readiness

Този файл описва кратък сценарий за защита, checklist за проверка и подготвените demo профили/данни.

## Подготовка

1. Създай `.env` по `.env.example`. Ако demo-то е без MongoDB, задай `ANIMALS_ALLOW_MOCK_FALLBACK=true`.
2. Инсталирай зависимостите с `npm ci` или `npm install`.
3. Подготви demo данните:

```bash
npm run seed:demo
```

Ако искаш да подготвиш само JSON fallback данните, без опит за MongoDB seed:

```bash
node server/scripts/seedDemoData.js --json-only
```

Скриптът:

- подготвя demo профили за всички роли
- обновява примерните животни с подходящи статуси
- създава примерни заявки за осиновяване с различни статуси
- ако има активна MongoDB връзка, upsert-ва същите demo данни и в базата

## Demo профили

| Роля | Потребител | Парола | Състояние | Какво показва |
|---|---|---|---|---|
| admin | `admin` | `Admin1234` | активен | users management, reports, пълен контрол |
| employee | `employee` | `Employee1234` | активен | animals management и обработка на заявки |
| client | `client` | `Client1234` | активен | подаване и преглед на собствени заявки |
| client | `client2` | `Client2345` | активен | втори клиент за заявки и филтри |
| employee | `employee.inactive` | `Inactive1234` | неактивен | blocked login / access-control demo |

## Примерни demo данни

Животни:

- `Hotdog` е `available` и може да получи нова заявка.
- `Lily` е `reserved` за заявка със статус `under-review`.
- `Kiara` е `reserved` за заявка със статус `approved`.
- `Max` е `adopted` за завършена заявка.
- `Mona` е `available`, но има отменена заявка.

Заявки за осиновяване:

- `pending`: активна клиентска заявка, която още не е разгледана.
- `under-review`: заявка в служебен преглед с вътрешна бележка.
- `approved`: одобрена заявка, очакваща финализиране.
- `completed`: завършено осиновяване.
- `cancelled`: отменена заявка от клиентския поток.

## Demo сценарий за защита

1. Отвори началната страница като guest и покажи публичните части: home, animals list, details, search/filter.
2. Влез като `client` и отвори детайл на животно със статус `available`.
3. Подай заявка за осиновяване и покажи success feedback.
4. Отвори „Моите заявки“ и покажи, че клиентът вижда само собствените си заявки.
5. Излез и влез като `employee`.
6. Покажи служебния списък със заявки, филтър по статус и detail view.
7. Смени статус на заявка и покажи вътрешна бележка.
8. Покажи, че при `under-review`/`approved` животното става `reserved`, а при `completed` става `adopted`.
9. Влез като `admin` и покажи Users management: филтри, детайли, създаване/редакция на служител и активиране/деактивиране.
10. Покажи Reports dashboard: summary cards, breakdown-и и периодни филтри.
11. Опитай вход с `employee.inactive` и покажи, че деактивиран потребител не може да влиза нормално.

## Кратък checklist за проверка

- `npm run seed:demo` минава без грешка.
- `npm run build` минава успешно.
- `npm run check:regression` минава успешно.
- Guest вижда животни и детайли, но не може да подава заявка.
- Client може да подаде заявка и вижда „Моите заявки“.
- Client няма достъп до staff/admin страници.
- Employee управлява animals и adoption requests, но няма достъп до users/reports admin части.
- Admin вижда users management и reports.
- Deactivated user не може да влезе нормално.
- Animal status sync работи при обработка на adoption request.

## Полезни route-и за demo

- `/`
- `/animals`
- `/animals/:animalId`
- `/login`
- `/register`
- `/adoptions/my`
- `/staff/adoptions`
- `/admin/adoptions`
- `/admin/users`
- `/admin/reports`

## Бележки

- `npm run check:regression` използва временни fixtures и възстановява JSON файловете след проверката.
- `npm run seed:demo` оставя demo данните в JSON fallback файловете и, при налична MongoDB връзка, ги записва и в базата.
- При реална защита е добре първо да се пусне `npm run seed:demo`, после `npm run dev`.

