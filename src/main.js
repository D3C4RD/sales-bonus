/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */

function calculateSimpleRevenue(purchase, _product) {
   //Расчет выручки от операции
   const discount = 1 - (purchase.discount / 100);
   return purchase.sale_price * purchase.quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    //Расчет бонуса от позиции в рейтинге
    switch(index) {
        case 0:
            return seller.profit * 0.15;
            break;
        case 1:
        case 2:
            return seller.profit * 0.1;
            break;
        case total-1:
            return 0;
            break;
        default: 
            return seller.profit * 0.05;
            break;
    }       
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data || !Array.isArray(data.sellers) || !Array.isArray(data.customers) || !Array.isArray(data.products) || !Array.isArray(data.purchase_records) ||
            data.sellers.length === 0 || data.customers.length === 0 || data.products.length === 0 || data.purchase_records.length === 0 
    ) 
    {
        throw new Error('Некорректные входные данные');
    }

    // Проверка наличия опций
    if (typeof options !== "object") {
        throw new Error('Неверно заданы опции');
    }

    if(Object.keys(options).length !== 2) {
        throw new Error('Должно быть 2 функции');
    }
    else if(typeof Object.values(options)[0] !== "function" || typeof Object.values(options)[1] !== "function") 
    {   
        throw new Error('Нужен тип данных function в обоих случаях');
    }
    
    // Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: seller.first_name + " " + seller.last_name,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {},
        bonus: 0,
    }));

    // Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = sellerStats.reduce((result, item) => ({
        ...result,
        [item.seller_id]: item
    }), {});

    const productIndex = data.products.reduce((result, item) => ({
        ...result,
        [item.sku]: item
    }), {});

    // Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach( record => {
        const seller = sellerIndex[record.seller_id];
        seller.sales_count += 1;
        seller.revenue += record.total_amount;
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            const cost = product.purchase_price * item.quantity;
            const revenue = calculateSimpleRevenue(item, record);
            const profit = revenue - cost;
            seller.profit += profit;
            if(!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        })
    });

    // Сортировка продавцов по прибыли
    sellerStats.sort((a,b) => b.profit - a.profit);

    // Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) =>{
        seller.bonus = calculateBonusByProfit(index, sellerStats.length, seller);
        seller.top_products = Object.entries(seller.products_sold).map( ([key,value]) => ({[key]:value})).sort((a,b) => Object.values(b) - Object.values(a)).slice(0,10);
    });

    // Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}

