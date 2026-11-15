#!/usr/bin/env python3
"""
K2 — Earth System Trend Detective
ETL: real NASA / NOAA data -> normalized monthly cube for Kyrgyzstan.

Sources
-------
NASA POWER (MERRA-2 / GLDAS land surface, GPM IMERG precipitation):
  https://power.larc.nasa.gov/docs/services/api/temporal/monthly/
NASA MODIS via ORNL DAAC REST API:
  MOD13Q1 NDVI (16-day, 250 m), MOD10A2 snow cover (8-day, 500 m)
NOAA NCEI NOAAGlobalTemp v6 + NOAA GML Mauna Loa CO2
GeoBoundaries KGZ ADM1 (ODbL) for the map.

The script is idempotent and caches raw API responses in etl/.cache.
Run:  python3 etl/fetch_data.py
"""

from __future__ import annotations

import json
import math
import os
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
GEO = DATA / "geo"
CACHE = ROOT / "etl" / ".cache"
for p in (DATA, GEO, CACHE):
    p.mkdir(parents=True, exist_ok=True)

PERIOD_START = 2000
PERIOD_END = 2025
TIMEOUT = 120
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "K2/1.0 (NASA Space Apps Challenge; research demo)"})

# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------

SECTIONS = [
    {
        "code": "water",
        "name": "Вода",
        "nameEn": "Water",
        "description": "Озёра, реки, почвенная влага и испарение.",
        "descriptionEn": "Lakes, rivers, soil moisture and evaporation.",
        "accent": "aurora",
        "icon": "waves",
        "order": 1,
    },
    {
        "code": "snow",
        "name": "Снег и лёд",
        "nameEn": "Snow & ice",
        "description": "Снежный покров, снегозапас и длительность снежного сезона.",
        "descriptionEn": "Snow cover, snowpack and snow-season length.",
        "accent": "ice",
        "icon": "snowflake",
        "order": 2,
    },
    {
        "code": "climate",
        "name": "Климат",
        "nameEn": "Climate",
        "description": "Температура воздуха и осадки — база для остальных историй.",
        "descriptionEn": "Air temperature and precipitation — the base for other stories.",
        "accent": "solar",
        "icon": "thermometer",
        "order": 3,
    },
    {
        "code": "vegetation",
        "name": "Растительность",
        "nameEn": "Vegetation",
        "description": "NDVI — спутниковый индекс зелёной фитомассы.",
        "descriptionEn": "NDVI — a satellite greenness index.",
        "accent": "lime",
        "icon": "sprout",
        "order": 4,
    },
    {
        "code": "global",
        "name": "Глобальный контекст",
        "nameEn": "Global context",
        "description": "Планетарные индикаторы, с которыми сверяются местные тренды.",
        "descriptionEn": "Planetary indicators for comparison with local trends.",
        "accent": "violet",
        "icon": "globe",
        "order": 5,
    },
]

POWER_SOURCE = {
    "name": "NASA POWER",
    "url": "https://power.larc.nasa.gov/",
    "license": "NASA Open Data",
    "citation": "NASA Langley Research Center. POWER Project. https://power.larc.nasa.gov/",
}

MODISA_SOURCE = {
    "name": "NASA MODIS / ORNL DAAC",
    "url": "https://modis.ornl.gov/",
    "license": "NASA Open Data",
    "citation": "ORNL DAAC. MODIS/VIIRS Subsetting Tools. https://modis.ornl.gov/",
}

NOAA_TEMP_SOURCE = {
    "name": "NOAA NCEI",
    "url": "https://www.ncei.noaa.gov/products/land-based-station/noaa-global-temp",
    "license": "Public domain (U.S. Government)",
    "citation": "NOAA National Centers for Environmental Information, NOAAGlobalTemp v6.",
}

NOAA_CO2_SOURCE = {
    "name": "NOAA GML",
    "url": "https://gml.noaa.gov/ccgg/trends/",
    "license": "Public domain (U.S. Government)",
    "citation": "Dlugokencky, E. and Tans, P. NOAA/GML. Trends in Atmospheric Carbon Dioxide.",
}

HYDROWEB_RECON_SOURCE = {
    "name": "Zhang et al. (2022)",
    "url": "https://doi.org/10.3390/rs14071575",
    "license": "CC BY 4.0 (публикация)",
    "citation": "Zhang et al. (2022). The Dynamic Changes of Lake Issyk-Kul from 1958 to 2020 Based on Multi-Source Satellite Data. Remote Sensing 14(7), 1575.",
}

VARIABLES: dict[str, dict[str, Any]] = {
    "t2m": {
        "code": "t2m",
        "section": "climate",
        "name": "Температура воздуха",
        "nameEn": "Air temperature",
        "shortName": "Температура",
        "unit": "°C",
        "displayUnit": "°C",
        "displayScale": 1,
        "yearlyAgg": "mean",
        "seasonMonths": None,
        "nativeStep": "month",
        "directionNote": "Теплее — выше.",
        "description": "Средняя температура воздуха на высоте 2 м. Рассчитана по данным реанализа MERRA-2 / land surface модели GLDAS в точке объекта.",
        "whyItMatters": "Температура — ведущий индикатор изменения снега, льда, испарения и водного баланса.",
        "source": POWER_SOURCE,
        "dataset": "MERRA-2 (NASA POWER monthly)",
        "precision": 1,
        "isProxy": False,
        "isReconstruction": False,
        "color": "#fbbf24",
    },
    "precip": {
        "code": "precip",
        "section": "climate",
        "name": "Осадки",
        "nameEn": "Precipitation",
        "shortName": "Осадки",
        "unit": "мм/мес",
        "displayUnit": "мм/год",
        "displayScale": 1,
        "yearlyAgg": "sum",
        "seasonMonths": None,
        "nativeStep": "month",
        "directionNote": "Больше осадков — выше.",
        "description": "Сумма осадков за месяц. NASA POWER объединяет MERRA-2 и GPM IMERG; в горах значение является модельной оценкой, а не дождемером.",
        "whyItMatters": "Осадки пополняют снегозапас, реки и почвенную влагу. В горах Кыргызстана большая часть осадков выпадает зимой и весной.",
        "source": POWER_SOURCE,
        "dataset": "MERRA-2 + GPM IMERG (NASA POWER monthly)",
        "precision": 1,
        "isProxy": False,
        "isReconstruction": False,
        "color": "#38bdf8",
    },
    "soil_moisture": {
        "code": "soil_moisture",
        "section": "water",
        "name": "Влажность почвы",
        "nameEn": "Root-zone soil moisture",
        "shortName": "Почвенная влага",
        "unit": "%",
        "displayUnit": "%",
        "displayScale": 1,
        "yearlyAgg": "mean",
        "seasonMonths": None,
        "nativeStep": "month",
        "directionNote": "Влажнее — выше.",
        "description": "Относительная влажность корневой зоны почвы (0–100 %). Это доля доступного объёма пор, а не абсолютный запас воды.",
        "whyItMatters": "Почвенная влага связывает осадки, испарение и растительность. Это чувствительный индикатор засух.",
        "source": POWER_SOURCE,
        "dataset": "MERRA-2 / GLDAS land surface (NASA POWER monthly)",
        "precision": 1,
        "isProxy": False,
        "isReconstruction": False,
        "color": "#2ee6c8",
    },
    "evaporation": {
        "code": "evaporation",
        "section": "water",
        "name": "Испарение с суши",
        "nameEn": "Land evaporation",
        "shortName": "Испарение",
        "unit": "мм/мес",
        "displayUnit": "мм/год",
        "displayScale": 1,
        "yearlyAgg": "sum",
        "seasonMonths": None,
        "nativeStep": "month",
        "directionNote": "Больше испарения — выше.",
        "description": "Суммарное испарение с поверхности суши, включая транспирацию растительности. Модельная величина NASA POWER.",
        "whyItMatters": "Испарение — расходная часть водного баланса. При потеплении оно может расти и уменьшать сток.",
        "source": POWER_SOURCE,
        "dataset": "MERRA-2 / GLDAS land surface (NASA POWER monthly)",
        "precision": 1,
        "isProxy": False,
        "isReconstruction": False,
        "color": "#6cf7de",
    },
    "snow_depth": {
        "code": "snow_depth",
        "section": "snow",
        "name": "Глубина снега",
        "nameEn": "Snow depth",
        "shortName": "Глубина снега",
        "unit": "см",
        "displayUnit": "см",
        "displayScale": 1,
        "yearlyAgg": "mean",
        "seasonMonths": None,
        "nativeStep": "month",
        "directionNote": "Больше снега — выше.",
        "description": "Средняя за месяц глубина снежного покрова в модельной ячейке. Это не масса льда и не снегозапас в мм водного эквивалента.",
        "whyItMatters": "Снег — природный резервуар воды. Его глубина и продолжительность залегания определяют весенний сток.",
        "source": POWER_SOURCE,
        "dataset": "MERRA-2 / GLDAS land surface (NASA POWER monthly)",
        "precision": 1,
        "isProxy": True,
        "proxyNote": "Модельная глубина снега, а не прямое измерение снегозапаса.",
        "isReconstruction": False,
        "color": "#7dd3fc",
    },
    "snow_precip": {
        "code": "snow_precip",
        "section": "snow",
        "name": "Осадки в виде снега",
        "nameEn": "Snowfall",
        "shortName": "Снегопад",
        "unit": "мм/мес",
        "displayUnit": "мм/год",
        "displayScale": 1,
        "yearlyAgg": "sum",
        "seasonMonths": None,
        "nativeStep": "month",
        "directionNote": "Больше снега — выше.",
        "description": "Осадки, выпавшие в виде снега, в мм водного эквивалента. Модельная величина.",
        "whyItMatters": "Доля снега в осадках меняется при потеплении: часть зимних осадков переходит в дождь.",
        "source": POWER_SOURCE,
        "dataset": "MERRA-2 / GLDAS land surface (NASA POWER monthly)",
        "precision": 1,
        "isProxy": False,
        "isReconstruction": False,
        "color": "#bae6fd",
    },
    "snow_cover": {
        "code": "snow_cover",
        "section": "snow",
        "name": "Доля снежного покрова",
        "nameEn": "Snow cover fraction",
        "shortName": "Снежный покров",
        "unit": "%",
        "displayUnit": "%",
        "displayScale": 1,
        "yearlyAgg": "mean",
        "seasonMonths": [10, 11, 12, 1, 2, 3, 4, 5],
        "nativeStep": "month",
        "directionNote": "Больше снега — выше.",
        "description": "Средняя доля площади в окрестности точки, покрытая снегом, по 8-дневным композитам MODIS MOD10A2. Облачность и полярная ночь могут давать пропуски.",
        "whyItMatters": "Доля снежного покрова — прямой спутниковый индикатор того, как долго и на какой площади лежит снег.",
        "source": MODISA_SOURCE,
        "dataset": "MODIS MOD10A2 (8-day, 500 m)",
        "precision": 0,
        "isProxy": False,
        "isReconstruction": False,
        "color": "#a5f3fc",
    },
    "snow_days": {
        "code": "snow_days",
        "section": "snow",
        "name": "Длительность снежного сезона",
        "nameEn": "Snow season length",
        "shortName": "Снежный сезон",
        "unit": "дней/год",
        "displayUnit": "дней/год",
        "displayScale": 1,
        "yearlyAgg": "mean",
        "seasonMonths": None,
        "nativeStep": "year",
        "directionNote": "Дольше снег — выше.",
        "description": "Число дней в году, когда модельная глубина снега в ячейке NASA POWER не меньше 1 см. Это производная величина по ежедневным данным MERRA-2, а не спутниковый снежный покров.",
        "whyItMatters": "Длительность снежного сезона напрямую влияет на водоснабжение, пастбища и риск весенних паводков.",
        "source": POWER_SOURCE,
        "dataset": "MERRA-2 daily snow depth (NASA POWER), derived",
        "precision": 0,
        "isProxy": True,
        "proxyNote": "Производная величина: число дней с глубиной снега ≥ 1 см по модельному ряду, а не по MODIS.",
        "isReconstruction": False,
        "color": "#67e8f9",
    },
    "ndvi": {
        "code": "ndvi",
        "section": "vegetation",
        "name": "NDVI",
        "nameEn": "NDVI",
        "shortName": "NDVI",
        "unit": "индекс",
        "displayUnit": "индекс",
        "displayScale": 1,
        "yearlyAgg": "mean",
        "seasonMonths": [4, 5, 6, 7, 8, 9],
        "nativeStep": "month",
        "directionNote": "Зеленее — выше.",
        "description": "Normalized Difference Vegetation Index по MODIS MOD13Q1 (16-дневные композиты, 250 м). Среднее по окрестности точки; annual — среднее за вегетационный сезон (апрель–сентябрь).",
        "whyItMatters": "NDVI отражает состояние растительности и чувствителен к засухе, теплу и влаге. В горах сигнал зависит от высоты и типа поверхности.",
        "source": MODISA_SOURCE,
        "dataset": "MODIS MOD13Q1 (16-day, 250 m)",
        "precision": 3,
        "isProxy": True,
        "proxyNote": "Спутниковый индекс зелёности, не продуктивность экосистемы.",
        "isReconstruction": False,
        "color": "#a3e635",
    },
    "lake_level": {
        "code": "lake_level",
        "section": "water",
        "name": "Уровень озера",
        "nameEn": "Lake water level",
        "shortName": "Уровень озера",
        "unit": "м",
        "displayUnit": "см",
        "displayScale": 100,
        "yearlyAgg": "mean",
        "seasonMonths": None,
        "nativeStep": "year",
        "directionNote": "Выше уровень — выше.",
        "description": "Годовой уровень поверхности Иссык-Куля. Это реконструкция по опубликованным данным in situ и спутниковой альтиметрии (CryoSat-2, ICESat-2), а не сырой ряд Hydroweb.",
        "whyItMatters": "Уровень озера интегрирует осадки, приток рек, испарение и водозабор. Это самый понятный индикатор водного баланса бассейна.",
        "source": HYDROWEB_RECON_SOURCE,
        "dataset": "Реконструкция уровня Иссык-Куля по in situ и альтиметрии",
        "precision": 2,
        "isProxy": False,
        "isReconstruction": True,
        "reconstructionNote": "Реконструкция по опубликованным темпам и опорным значениям. Для официальных выводов используйте Hydroweb / DAHITI.",
        "color": "#2ee6c8",
    },
    "global_temp": {
        "code": "global_temp",
        "section": "global",
        "name": "Аномалия глобальной температуры",
        "nameEn": "Global temperature anomaly",
        "shortName": "Глобальная аномалия",
        "unit": "°C",
        "displayUnit": "°C",
        "displayScale": 1,
        "yearlyAgg": "mean",
        "seasonMonths": None,
        "nativeStep": "month",
        "directionNote": "Теплее — выше.",
        "description": "Аномалия средней глобальной температуры суши и океана относительно базового периода XX века (NOAAGlobalTemp v6).",
        "whyItMatters": "Глобальный контекст помогает увидеть, согласуется ли местный тренд с планетарным сигналом. Это сопоставление, а не доказательство причинности.",
        "source": NOAA_TEMP_SOURCE,
        "dataset": "NOAAGlobalTemp v6",
        "precision": 2,
        "isProxy": False,
        "isReconstruction": False,
        "color": "#c084fc",
    },
    "co2": {
        "code": "co2",
        "section": "global",
        "name": "Концентрация CO₂",
        "nameEn": "CO₂ concentration",
        "shortName": "CO₂",
        "unit": "ppm",
        "displayUnit": "ppm",
        "displayScale": 1,
        "yearlyAgg": "mean",
        "seasonMonths": None,
        "nativeStep": "month",
        "directionNote": "Больше CO₂ — выше.",
        "description": "Среднемесячная концентрация CO₂ в атмосфере по обсерватории Мауна-Лоа (NOAA GML).",
        "whyItMatters": "CO₂ — главный долгоживущий парниковый газ. Его рост — планетарный фон, на который накладываются местные изменения.",
        "source": NOAA_CO2_SOURCE,
        "dataset": "NOAA GML Mauna Loa CO₂",
        "precision": 2,
        "isProxy": False,
        "isReconstruction": False,
        "color": "#a78bfa",
    },
}

# object: code, type, name, nameEn, lat, lon, region, elevation, area, description, tags
OBJECTS: list[dict[str, Any]] = [
    {
        "code": "issyk-kul",
        "type": "lake",
        "name": "Иссык-Куль",
        "nameEn": "Issyk-Kul",
        "lat": 42.42,
        "lon": 77.33,
        "region": "Иссык-Кульская область",
        "elevation": 1607,
        "areaKm2": 6236,
        "description": "Крупнейшее высокогорное озеро Центральной Азии. Бессточное; уровень зависит от притока рек, осадков, испарения и водозабора.",
        "tags": ["озеро", "высокогорье", "водный баланс"],
        "highlight": True,
    },
    {
        "code": "son-kul",
        "type": "lake",
        "name": "Сон-Куль",
        "nameEn": "Son-Kul",
        "lat": 41.83,
        "lon": 75.13,
        "region": "Нарынская область",
        "elevation": 3016,
        "areaKm2": 278,
        "description": "Высокогорное озеро в Нарынской области, важный пастбищный и водный объект.",
        "tags": ["озеро", "высокогорье"],
    },
    {
        "code": "chatyr-kul",
        "type": "lake",
        "name": "Чатыр-Куль",
        "nameEn": "Chatyr-Kul",
        "lat": 40.62,
        "lon": 75.28,
        "region": "Нарынская область",
        "elevation": 3530,
        "areaKm2": 175,
        "description": "Высокогорное озеро на юге Нарынской области, у границы с Китаем.",
        "tags": ["озеро", "высокогорье"],
    },
    {
        "code": "toktogul",
        "type": "reservoir",
        "name": "Токтогульское водохранилище",
        "nameEn": "Toktogul Reservoir",
        "lat": 41.87,
        "lon": 72.95,
        "region": "Джалал-Абадская область",
        "elevation": 900,
        "areaKm2": 284,
        "description": "Крупнейшее водохранилище Кыргызстана. Уровень регулируется режимом ГЭС, поэтому климатический тренд здесь нельзя читать без оговорки.",
        "tags": ["водохранилище", "регулируемый объект", "ГЭС"],
        "isRegulated": True,
        "regulatedNote": "Регулируемый объект: уровень задаётся режимом ГЭС, а не только климатом.",
    },
    {
        "code": "naryn",
        "type": "river",
        "name": "Бассейн Нарына",
        "nameEn": "Naryn River basin",
        "lat": 41.45,
        "lon": 75.5,
        "region": "Нарынская область",
        "elevation": 2000,
        "areaKm2": 58200,
        "description": "Верхний бассейн Нарына — главный источник стока Сырдарьи. Водность регулируется каскадом ГЭС.",
        "tags": ["река", "бассейн", "сток"],
    },
    {
        "code": "chu",
        "type": "river",
        "name": "Бассейн Чу",
        "nameEn": "Chu River basin",
        "lat": 42.75,
        "lon": 74.5,
        "region": "Чуйская область",
        "elevation": 1500,
        "areaKm2": 25600,
        "description": "Бассейн Чу на севере Кыргызстана; сток формируется в Кыргызском хребте и используется для орошения.",
        "tags": ["река", "бассейн", "орошение"],
    },
    {
        "code": "enilchek",
        "type": "glacier",
        "name": "Ледник Энильчек",
        "nameEn": "Enilchek Glacier",
        "lat": 42.15,
        "lon": 79.85,
        "region": "Иссык-Кульская область",
        "elevation": 3400,
        "areaKm2": 480,
        "description": "Крупный ледниковый узел в восточном Тянь-Шане. Прямых рядов массы льда нет; используем снежный покров и температуру.",
        "tags": ["ледник", "Тянь-Шань"],
        "isProxy": True,
    },
    {
        "code": "petrov",
        "type": "glacier",
        "name": "Ледник Петрова",
        "nameEn": "Petrov Glacier",
        "lat": 41.95,
        "lon": 78.35,
        "region": "Иссык-Кульская область",
        "elevation": 3600,
        "areaKm2": 70,
        "description": "Долинный ледник в системе Ак-Шыйрак. Косвенные индикаторы: снежный покров, температура поверхности.",
        "tags": ["ледник", "Ак-Шыйрак"],
        "isProxy": True,
    },
    {
        "code": "ak-shyirak",
        "type": "glacier",
        "name": "Массив Ак-Шыйрак",
        "nameEn": "Ak-Shyirak massif",
        "lat": 41.85,
        "lon": 78.2,
        "region": "Иссык-Кульская область",
        "elevation": 3900,
        "areaKm2": 120,
        "description": "Ледниковый массив в центральном Тянь-Шане, один из наиболее изученных в Кыргызстане.",
        "tags": ["ледник", "Тянь-Шань"],
        "isProxy": True,
    },
    {
        "code": "golubina",
        "type": "glacier",
        "name": "Ледник Голубина",
        "nameEn": "Golubina Glacier",
        "lat": 42.45,
        "lon": 74.5,
        "region": "Чуйская область",
        "elevation": 3600,
        "areaKm2": 5,
        "description": "Небольшой ледник в бассейне Ала-Арчи, удобный для наблюдения за сезонным снежным покровом.",
        "tags": ["ледник", "Ала-Арча"],
        "isProxy": True,
    },
    {
        "code": "chuy",
        "type": "region",
        "name": "Чуйская область",
        "nameEn": "Chuy Region",
        "lat": 42.85,
        "lon": 74.6,
        "region": "Чуйская область",
        "elevation": 800,
        "areaKm2": 20200,
        "description": "Северный регион с высокой долей орошаемого земледелия и крупными городами.",
        "tags": ["регион"],
    },
    {
        "code": "talas",
        "type": "region",
        "name": "Таласская область",
        "nameEn": "Talas Region",
        "lat": 42.5,
        "lon": 72.2,
        "region": "Таласская область",
        "elevation": 1200,
        "areaKm2": 11400,
        "description": "Западный регион, зависимый от снегового питания рек.",
        "tags": ["регион"],
    },
    {
        "code": "jalal-abad",
        "type": "region",
        "name": "Джалал-Абадская область",
        "nameEn": "Jalal-Abad Region",
        "lat": 41.5,
        "lon": 72.5,
        "region": "Джалал-Абадская область",
        "elevation": 1000,
        "areaKm2": 33700,
        "description": "Юго-западный регион с долинами, предгорьями и высокогорными пастбищами.",
        "tags": ["регион"],
    },
    {
        "code": "osh-region",
        "type": "region",
        "name": "Ошская область",
        "nameEn": "Osh Region",
        "lat": 40.5,
        "lon": 73.0,
        "region": "Ошская область",
        "elevation": 1200,
        "areaKm2": 29200,
        "description": "Южный регион с контрастом долин и высокогорья.",
        "tags": ["регион"],
    },
    {
        "code": "batken",
        "type": "region",
        "name": "Баткенская область",
        "nameEn": "Batken Region",
        "lat": 40.0,
        "lon": 70.8,
        "region": "Баткенская область",
        "elevation": 1200,
        "areaKm2": 17000,
        "description": "Самый юго-западный регион, уязвимый к засухам и изменению стока.",
        "tags": ["регион"],
    },
    {
        "code": "naryn-region",
        "type": "region",
        "name": "Нарынская область",
        "nameEn": "Naryn Region",
        "lat": 41.4,
        "lon": 75.9,
        "region": "Нарынская область",
        "elevation": 2000,
        "areaKm2": 45200,
        "description": "Высокогорный регион, где формируется значительная часть стока Сырдарьи.",
        "tags": ["регион", "высокогорье"],
    },
    {
        "code": "issyk-kul-region",
        "type": "region",
        "name": "Иссык-Кульская область",
        "nameEn": "Issyk-Kul Region",
        "lat": 42.4,
        "lon": 77.3,
        "region": "Иссык-Кульская область",
        "elevation": 1600,
        "areaKm2": 43100,
        "description": "Регион вокруг Иссык-Куля с высокой климатической чувствительностью.",
        "tags": ["регион"],
    },
    {
        "code": "bishkek",
        "type": "city",
        "name": "Бишкек",
        "nameEn": "Bishkek",
        "lat": 42.87,
        "lon": 74.59,
        "region": "Бишкек",
        "elevation": 800,
        "areaKm2": 170,
        "description": "Столица Кыргызстана; городской остров тепла и высокий спрос на воду.",
        "tags": ["город"],
    },
    {
        "code": "osh-city",
        "type": "city",
        "name": "Ош",
        "nameEn": "Osh",
        "lat": 40.53,
        "lon": 72.8,
        "region": "Ош",
        "elevation": 1000,
        "areaKm2": 180,
        "description": "Второй по величине город страны, южная столица.",
        "tags": ["город"],
    },
    {
        "code": "earth",
        "type": "global",
        "name": "Планета Земля",
        "nameEn": "Earth",
        "lat": 0,
        "lon": 0,
        "region": "Глобальный",
        "elevation": None,
        "areaKm2": None,
        "description": "Глобальные индикаторы для сопоставления с местными трендами.",
        "tags": ["глобальный"],
        "isGlobal": True,
    },
]

# Which variables are available for each object type (data is checked later).
TYPE_VARIABLES: dict[str, list[str]] = {
    "lake": ["t2m", "precip", "soil_moisture", "evaporation", "snow_depth", "snow_precip", "snow_cover", "ndvi", "lake_level"],
    "reservoir": ["t2m", "precip", "soil_moisture", "evaporation", "snow_depth", "snow_precip", "ndvi"],
    "river": ["t2m", "precip", "soil_moisture", "evaporation", "snow_depth", "snow_precip", "ndvi"],
    "glacier": ["t2m", "precip", "snow_depth", "snow_precip", "snow_cover", "snow_days", "ndvi"],
    "region": ["t2m", "precip", "soil_moisture", "evaporation", "snow_depth", "snow_precip", "snow_cover", "snow_days", "ndvi"],
    "city": ["t2m", "precip", "soil_moisture", "evaporation", "snow_depth", "snow_precip", "ndvi"],
    "grid": ["t2m", "precip", "soil_moisture", "snow_depth"],
    "global": ["global_temp", "co2"],
}

VARIABLE_EN = {
    "t2m": {
        "description": "Mean air temperature at 2 m, derived from MERRA-2 / GLDAS reanalysis at the object's location.",
        "whyItMatters": "Temperature is the leading indicator for snow, ice, evaporation and the water balance.",
    },
    "precip": {
        "description": "Monthly precipitation total. NASA POWER blends MERRA-2 and GPM IMERG; in mountains this is a modelled estimate, not a rain gauge.",
        "whyItMatters": "Precipitation replenishes snowpack, rivers and soil moisture. In Kyrgyzstan's mountains most precipitation falls in winter and spring.",
    },
    "soil_moisture": {
        "description": "Relative root-zone soil wetness (0–100%). It is the fraction of available pore space, not absolute water storage.",
        "whyItMatters": "Soil moisture links precipitation, evaporation and vegetation; it is a sensitive drought indicator.",
    },
    "evaporation": {
        "description": "Total land evaporation, including plant transpiration. A modelled NASA POWER quantity.",
        "whyItMatters": "Evaporation is the loss side of the water balance; it can grow with warming and reduce runoff.",
    },
    "snow_depth": {
        "description": "Mean monthly snow depth in the model grid cell. This is not ice mass or snow water equivalent.",
        "whyItMatters": "Snow is a natural water reservoir; its depth and duration shape spring runoff.",
    },
    "snow_precip": {
        "description": "Precipitation that fell as snow, in mm of water equivalent. A modelled quantity.",
        "whyItMatters": "The snow fraction of precipitation changes with warming: some winter precipitation becomes rain.",
    },
    "snow_days": {
        "description": "Number of days per year with modelled snow depth of at least 1 cm. A derived MERRA-2 quantity, not satellite snow cover.",
        "whyItMatters": "Snow-season length affects water supply, pastures and spring flood risk.",
    },
    "lake_level": {
        "description": "Annual Issyk-Kul surface level. A reconstruction from published in situ and satellite altimetry (CryoSat-2, ICESat-2) values, not raw Hydroweb.",
        "whyItMatters": "Lake level integrates precipitation, river inflow, evaporation and water withdrawal — the clearest indicator of the basin's water balance.",
    },
    "global_temp": {
        "description": "Global land-ocean temperature anomaly relative to the 20th-century baseline (NOAAGlobalTemp v6).",
        "whyItMatters": "Global context helps see whether a local trend agrees with the planetary signal. This is a comparison, not proof of causation.",
    },
    "co2": {
        "description": "Monthly atmospheric CO₂ concentration at Mauna Loa (NOAA GML).",
        "whyItMatters": "CO₂ is the main long-lived greenhouse gas; its rise is the planetary backdrop for local changes.",
    },
}

OBJECT_EN = {
    "issyk-kul": "The largest high-mountain lake in Central Asia. Endorheic; its level depends on river inflow, precipitation, evaporation and water withdrawal.",
    "son-kul": "A high-mountain lake in Naryn Region, important for pastures and water.",
    "chatyr-kul": "A high-mountain lake in southern Naryn Region, near the Chinese border.",
    "toktogul": "Kyrgyzstan's largest reservoir. Its level is managed for hydropower, so a climate trend here needs a regulatory caveat.",
    "naryn": "The upper Naryn basin, the main source of Syr Darya runoff. Flow is regulated by a cascade of hydropower plants.",
    "chu": "The Chu basin in northern Kyrgyzstan; runoff forms in the Kyrgyz Range and is used for irrigation.",
    "enilchek": "A major glacier node in the eastern Tien Shan. No direct ice-mass series; we use snow cover and temperature.",
    "petrov": "A valley glacier in the Ak-Shyirak system. Indirect indicators: snow cover and surface temperature.",
    "ak-shyirak": "A glacier massif in the central Tien Shan, one of the most studied in Kyrgyzstan.",
    "golubina": "A small glacier in the Ala-Archa basin, useful for observing seasonal snow cover.",
    "chuy": "A northern region with a high share of irrigated agriculture and major cities.",
    "talas": "A western region dependent on snow-fed rivers.",
    "jalal-abad": "A south-western region with valleys, foothills and high-mountain pastures.",
    "osh-region": "A southern region with a strong contrast between valleys and high mountains.",
    "batken": "The south-westernmost region, vulnerable to droughts and runoff change.",
    "naryn-region": "A high-mountain region that generates a large share of Syr Darya runoff.",
    "issyk-kul-region": "The region around Issyk-Kul, with high climate sensitivity.",
    "bishkek": "The capital; an urban heat island and high water demand.",
    "osh-city": "The country's second-largest city and southern capital.",
    "earth": "Global indicators for comparison with local trends.",
}

# MODIS objects. Kept for future runs; the public ORNL subset API is too slow
# for a 26-year point series (60+ s per request), so the default build uses
# NASA POWER daily snow depth to derive snow-season length instead.
NDVI_OBJECTS: list[str] = []
SNOW_OBJECTS: list[str] = []
SNOW_DAYS_OBJECTS = ["enilchek", "petrov", "ak-shyirak", "golubina", "naryn", "issyk-kul"]

PHENOMENA = [
    {
        "code": "global-warming",
        "name": "Глобальное потепление",
        "nameEn": "Global warming",
        "description": "Сопоставление планетарной аномалии температуры с местными трендами температуры, снега и воды. Это контекст, а не доказательство причинной связи.",
        "descriptionEn": "A comparison of the planetary temperature anomaly with local temperature, snow and water trends. This is context, not proof of causation.",
        "globalVariable": "global_temp",
        "globalLabel": "Аномалия глобальной температуры",
        "globalLabelEn": "Global temperature anomaly",
        "localVariables": ["t2m", "snow_cover", "snow_days", "lake_level", "soil_moisture"],
        "accent": "solar",
        "icon": "flame",
        "caveat": "Совпадение направлений не доказывает, что глобальное потепление вызвало именно это местное изменение.",
        "caveatEn": "Matching directions do not prove that global warming caused this particular local change.",
    },
    {
        "code": "precipitation-shift",
        "name": "Сдвиг режима осадков",
        "nameEn": "Precipitation shift",
        "description": "Как меняются осадки и связанная с ними почвенная влага в разных регионах. В горах тренд осадков особенно чувствителен к периоду.",
        "descriptionEn": "How precipitation and the associated soil moisture change across regions. In mountains, the precipitation trend is especially sensitive to the period.",
        "globalVariable": None,
        "globalLabel": None,
        "localVariables": ["precip", "soil_moisture", "snow_precip", "ndvi"],
        "accent": "ice",
        "icon": "cloud-rain",
        "caveat": "Осадки в горах имеют высокую пространственную изменчивость; одна точка не описывает весь бассейн.",
        "caveatEn": "Mountain precipitation is highly spatially variable; one point does not describe a whole basin.",
    },
    {
        "code": "snow-season",
        "name": "Снежный сезон",
        "nameEn": "Snow season",
        "description": "Длительность и площадь снежного покрова в высокогорье. Это не масса ледников: MODIS видит сезонный снег, а не лёд.",
        "descriptionEn": "The length and area of high-mountain snow cover. This is not glacier mass: MODIS sees seasonal snow, not ice.",
        "globalVariable": "global_temp",
        "globalLabel": "Аномалия глобальной температуры (контекст)",
        "globalLabelEn": "Global temperature anomaly (context)",
        "localVariables": ["snow_days", "snow_cover", "snow_depth", "t2m"],
        "accent": "ice",
        "icon": "snowflake",
        "caveat": "Снежный покров MODIS — сезонный снег. Масса ледников по этим данным не измеряется.",
        "caveatEn": "MODIS snow cover is seasonal snow. Glacier mass is not measured by these data.",
    },
]

CHAINS = [
    {
        "id": "lake-level",
        "section": "water",
        "targetVariable": "lake_level",
        "name": "Гипотеза водного баланса озера",
        "nameEn": "Lake water-balance hypothesis",
        "description": "Температура → снег → почвенная влага → испарение → уровень озера. Проверяем, согласуются ли направления трендов с этой гипотезой. Это не доказательство причинности.",
        "descriptionEn": "Temperature → snow → soil moisture → evaporation → lake level. We check whether the trend directions agree with this hypothesis. This is not proof of causation.",
        "links": [
            {
                "variable": "t2m",
                "expected": "+",
                "order": 1,
                "explanation": "Потепление меняет долю снега, испарение и сезонность стока.",
                "explanationEn": "Warming changes the snow fraction, evaporation and runoff seasonality.",
            },
            {
                "variable": "snow_depth",
                "expected": "-",
                "order": 2,
                "explanation": "При потеплении снег лежит меньше и сходит раньше; знак ожидается отрицательным.",
                "explanationEn": "With warming, snow lies for less time and melts earlier; the expected sign is negative.",
            },
            {
                "variable": "soil_moisture",
                "expected": "+",
                "order": 3,
                "explanation": "Больше воды в почве — больше доступной влаги для стока и испарения.",
                "explanationEn": "More soil water means more available moisture for runoff and evaporation.",
            },
            {
                "variable": "evaporation",
                "expected": "+",
                "order": 4,
                "explanation": "Теплее — больше испарения; это расходная часть баланса.",
                "explanationEn": "Warmer means more evaporation; this is the loss side of the balance.",
            },
            {
                "variable": "lake_level",
                "expected": "-",
                "order": 5,
                "explanation": "Если приток падает, а испарение растёт, уровень озера снижается.",
                "explanationEn": "If inflow falls while evaporation rises, the lake level declines.",
            },
        ],
    },
    {
        "id": "snow-season",
        "section": "snow",
        "targetVariable": "snow_days",
        "name": "Гипотеза снежного сезона",
        "nameEn": "Snow-season hypothesis",
        "description": "Температура → снегопад → глубина снега → длительность снежного сезона. Проверяем согласованность спутниковых и модельных индикаторов.",
        "descriptionEn": "Temperature → snowfall → snow depth → snow-season length. We check the consistency of satellite and modelled indicators.",
        "links": [
            {
                "variable": "t2m",
                "expected": "+",
                "order": 1,
                "explanation": "Рост температуры сокращает продолжительность залегания снега.",
                "explanationEn": "Higher temperature shortens the duration of snow cover.",
            },
            {
                "variable": "snow_precip",
                "expected": "-",
                "order": 2,
                "explanation": "Часть зимних осадков переходит из снега в дождь.",
                "explanationEn": "Part of winter precipitation shifts from snow to rain.",
            },
            {
                "variable": "snow_depth",
                "expected": "-",
                "order": 3,
                "explanation": "Меньше снегопада и теплее — меньше глубина снега.",
                "explanationEn": "Less snowfall and warmer conditions mean shallower snow.",
            },
            {
                "variable": "snow_days",
                "expected": "-",
                "order": 4,
                "explanation": "Снежный сезон должен укорачиваться.",
                "explanationEn": "The snow season should become shorter.",
            },
        ],
    },
    {
        "id": "vegetation",
        "section": "vegetation",
        "targetVariable": "ndvi",
        "name": "Гипотеза растительности",
        "description": "Температура и осадки → почвенная влага → NDVI. Проверяем, согласуется ли зелёность с водным режимом.",
        "links": [
            {
                "variable": "t2m",
                "expected": "+",
                "order": 1,
                "explanation": "Тепло удлиняет вегетационный сезон, но может усиливать стресс от засухи.",
            },
            {
                "variable": "precip",
                "expected": "+",
                "order": 2,
                "explanation": "Больше осадков — больше доступной влаги.",
            },
            {
                "variable": "soil_moisture",
                "expected": "+",
                "order": 3,
                "explanation": "Влажная почва поддерживает фотосинтез.",
            },
            {
                "variable": "ndvi",
                "expected": "+",
                "order": 4,
                "explanation": "При достатке воды зелёность растёт.",
            },
        ],
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def cache_path(name: str) -> Path:
    safe = "".join(c if c.isalnum() or c in "._-" else "_" for c in name)
    return CACHE / safe


def get_json(url: str, cache_name: str, retries: int = 4, timeout: int = TIMEOUT) -> Any:
    cp = cache_path(cache_name)
    if cp.exists():
        try:
            return json.loads(cp.read_text())
        except Exception:
            pass
    last = None
    for attempt in range(retries):
        try:
            r = SESSION.get(url, timeout=timeout)
            if r.status_code == 200:
                data = r.json()
                cp.write_text(json.dumps(data))
                return data
            last = f"HTTP {r.status_code}: {r.text[:200]}"
        except Exception as e:  # noqa: BLE001
            last = str(e)
        time.sleep(1.5 * (attempt + 1))
    print(f"  ! failed {cache_name}: {last}", file=sys.stderr)
    return None


def month_days(year: int, month: int) -> int:
    if month == 12:
        nxt = date(year + 1, 1, 1)
    else:
        nxt = date(year, month + 1, 1)
    return (nxt - date(year, month, 1)).days


def fmt_date(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}-01"


def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def rnd(v: float, nd: int) -> float:
    return round(float(v), nd)


# ---------------------------------------------------------------------------
# NASA POWER
# ---------------------------------------------------------------------------

POWER_PARAMS = ["T2M", "PRECTOTCORR", "GWETROOT", "SNODP", "EVLAND", "PRECSNOLAND"]


def fetch_power(lat: float, lon: float, tag: str) -> dict[str, dict[str, float]]:
    url = (
        "https://power.larc.nasa.gov/api/temporal/monthly/point"
        f"?parameters={','.join(POWER_PARAMS)}&community=AG"
        f"&longitude={lon}&latitude={lat}&start={PERIOD_START}&end={PERIOD_END}&format=JSON"
    )
    data = get_json(url, f"power_{tag}.json")
    out: dict[str, dict[str, float]] = {p: {} for p in POWER_PARAMS}
    if not data or "properties" not in data:
        return out
    params = data["properties"].get("parameter", {})
    for p in POWER_PARAMS:
        for key, val in (params.get(p) or {}).items():
            if len(key) != 6 or key.endswith("13"):
                continue
            try:
                y, m = int(key[:4]), int(key[4:])
                if y < PERIOD_START or y > PERIOD_END or not (1 <= m <= 12):
                    continue
                if val is None or float(val) <= -900:
                    continue
                out[p][fmt_date(y, m)] = float(val)
            except Exception:
                continue
    return out


def fetch_power_daily_snow(lat: float, lon: float, tag: str) -> dict[str, Any] | None:
    url = (
        "https://power.larc.nasa.gov/api/temporal/daily/point"
        f"?parameters=SNODP&community=AG&longitude={lon}&latitude={lat}"
        f"&start={PERIOD_START}0101&end={PERIOD_END}1231&format=JSON"
    )
    data = get_json(url, f"power_daily_snow_{tag}.json", retries=3, timeout=180)
    if not data or "properties" not in data:
        return None
    vals = (data["properties"].get("parameter") or {}).get("SNODP") or {}
    days_by_year: dict[int, int] = {}
    valid_by_year: dict[int, int] = {}
    for key, val in vals.items():
        if len(key) != 8:
            continue
        try:
            y = int(key[:4])
            v = float(val)
        except Exception:
            continue
        if y < PERIOD_START or y > PERIOD_END:
            continue
        valid_by_year[y] = valid_by_year.get(y, 0) + 1
        if v >= 1.0:
            days_by_year[y] = days_by_year.get(y, 0) + 1
    points = []
    for y in range(PERIOD_START, PERIOD_END + 1):
        if valid_by_year.get(y, 0) >= 300:
            points.append([f"{y:04d}-01-01", float(days_by_year.get(y, 0)), "ok"])
    if len(points) < 10:
        return None
    return {
        "points": points,
        "source": POWER_SOURCE,
        "dataset": "MERRA-2 daily snow depth (NASA POWER), derived",
        "nativeStep": "year",
        "isProxy": True,
    }


def power_series_for_object(obj: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Return normalized monthly series for one object (POWER only)."""
    raw = fetch_power(obj["lat"], obj["lon"], obj["code"])
    out: dict[str, dict[str, Any]] = {}
    if not raw["T2M"]:
        return out
    for var, vals in {
        "t2m": raw["T2M"],
        "precip": raw["PRECTOTCORR"],
        "soil_moisture": raw["GWETROOT"],
        "snow_depth": raw["SNODP"],
        "evaporation": raw["EVLAND"],
        "snow_precip": raw["PRECSNOLAND"],
    }.items():
        points = []
        for ds in sorted(vals):
            y, m = int(ds[:4]), int(ds[5:7])
            v = vals[ds]
            if var == "soil_moisture":
                v = v * 100.0
            elif var in ("precip", "evaporation", "snow_precip"):
                v = v * month_days(y, m)
            points.append([ds, rnd(v, 2), "ok"])
        out[var] = {
            "points": points,
            "source": POWER_SOURCE,
            "dataset": "MERRA-2 / GLDAS (NASA POWER monthly)",
            "nativeStep": "month",
        }
    return out


# ---------------------------------------------------------------------------
# MODIS via ORNL
# ---------------------------------------------------------------------------

def modis_subset(product: str, band: str, lat: float, lon: float, tag: str) -> list[dict[str, Any]] | None:
    url = (
        f"https://modis.ornl.gov/rst/api/v1/{product}/subset"
        f"?latitude={lat}&longitude={lon}"
        f"&startDate=A{PERIOD_START}001&endDate=A{PERIOD_END}365"
        f"&band={band}&kmAboveBelow=1&kmLeftRight=1"
    )
    data = get_json(url, f"modis_{product}_{tag}.json", retries=5, timeout=240)
    if not data:
        return None
    return data.get("subset") or []


def modis_ndvi(obj: dict[str, Any]) -> dict[str, Any] | None:
    subset = modis_subset("MOD13Q1", "250m_16_days_NDVI", obj["lat"], obj["lon"], obj["code"])
    if not subset:
        return None
    by_month: dict[str, list[float]] = {}
    for rec in subset:
        vals = [v for v in rec.get("data", []) if isinstance(v, (int, float)) and -2000 <= v <= 10000]
        if len(vals) < 8:
            continue
        val = sum(vals) / len(vals) * 0.0001
        ds = rec.get("calendar_date")
        if not ds:
            continue
        key = ds[:7] + "-01"
        by_month.setdefault(key, []).append(val)
    points = []
    for ds in sorted(by_month):
        vals = by_month[ds]
        points.append([ds, rnd(sum(vals) / len(vals), 4), "ok"])
    if len(points) < 60:
        return None
    return {
        "points": points,
        "source": MODISA_SOURCE,
        "dataset": "MODIS MOD13Q1 (16-day, 250 m)",
        "nativeStep": "month",
    }


def modis_snow(obj: dict[str, Any]) -> dict[str, Any] | None:
    subset = modis_subset("MOD10A2", "Maximum_Snow_Extent", obj["lat"], obj["lon"], obj["code"])
    if not subset:
        return None
    by_month: dict[str, list[float]] = {}
    by_year_days: dict[int, float] = {}
    for rec in subset:
        vals = [v for v in rec.get("data", []) if isinstance(v, (int, float)) and 0 <= v <= 100]
        if len(vals) < 8:
            continue
        val = sum(vals) / len(vals)
        ds = rec.get("calendar_date")
        if not ds:
            continue
        key = ds[:7] + "-01"
        by_month.setdefault(key, []).append(val)
        y = int(ds[:4])
        if val >= 30:
            by_year_days[y] = by_year_days.get(y, 0) + 8
    monthly = []
    for ds in sorted(by_month):
        vals = by_month[ds]
        monthly.append([ds, rnd(sum(vals) / len(vals), 1), "ok"])
    annual = [[f"{y:04d}-01-01", rnd(by_year_days.get(y, 0), 0), "ok"] for y in range(PERIOD_START, PERIOD_END + 1) if y in by_year_days]
    if len(monthly) < 60 or len(annual) < 10:
        return None
    return {
        "snow_cover": {
            "points": monthly,
            "source": MODISA_SOURCE,
            "dataset": "MODIS MOD10A2 (8-day, 500 m)",
            "nativeStep": "month",
        },
        "snow_days": {
            "points": annual,
            "source": MODISA_SOURCE,
            "dataset": "MODIS MOD10A2 (8-day, 500 m), derived",
            "nativeStep": "year",
        },
    }


# ---------------------------------------------------------------------------
# NOAA
# ---------------------------------------------------------------------------

def fetch_noaa_temp() -> dict[str, Any] | None:
    url = "https://www.ncei.noaa.gov/data/noaa-global-surface-temperature/v6/access/timeseries/aravg.mon.land_ocean.90S.90N.v6.0.0.202512.asc"
    cp = cache_path("noaa_temp.asc")
    text = None
    if cp.exists():
        text = cp.read_text()
    else:
        try:
            r = SESSION.get(url, timeout=60)
            if r.status_code == 200:
                text = r.text
                cp.write_text(text)
        except Exception as e:  # noqa: BLE001
            print("  ! NOAA temp:", e, file=sys.stderr)
    if not text:
        return None
    points = []
    for line in text.splitlines():
        parts = line.split()
        if len(parts) < 3:
            continue
        try:
            y, m = int(parts[0]), int(parts[1])
            v = float(parts[2])
        except Exception:
            continue
        if y < PERIOD_START or y > PERIOD_END or v <= -900:
            continue
        points.append([fmt_date(y, m), rnd(v, 3), "ok"])
    if len(points) < 200:
        return None
    return {
        "points": points,
        "source": NOAA_TEMP_SOURCE,
        "dataset": "NOAAGlobalTemp v6",
        "nativeStep": "month",
    }


def fetch_co2() -> dict[str, Any] | None:
    url = "https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.csv"
    cp = cache_path("co2_mm_mlo.csv")
    text = None
    if cp.exists():
        text = cp.read_text()
    else:
        try:
            r = SESSION.get(url, timeout=60)
            if r.status_code == 200:
                text = r.text
                cp.write_text(text)
        except Exception as e:  # noqa: BLE001
            print("  ! NOAA CO2:", e, file=sys.stderr)
    if not text:
        return None
    points = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("year"):
            continue
        parts = [p.strip() for p in line.split(",")]
        if len(parts) < 5:
            continue
        try:
            y, m = int(parts[0]), int(parts[1])
            v = float(parts[4])
        except Exception:
            continue
        if y < PERIOD_START or y > PERIOD_END or v <= 0:
            continue
        points.append([fmt_date(y, m), rnd(v, 2), "ok"])
    if len(points) < 200:
        return None
    return {
        "points": points,
        "source": NOAA_CO2_SOURCE,
        "dataset": "NOAA GML Mauna Loa CO₂",
        "nativeStep": "month",
    }


# ---------------------------------------------------------------------------
# Lake level reconstruction (Issyk-Kul)
# ---------------------------------------------------------------------------

def lake_level_reconstruction() -> dict[str, Any]:
    """Annual reconstruction anchored to published values/rates.

    Anchors (Zhang et al., 2022, Remote Sensing 14(7), 1575):
      1980 = 1606.73 m, 1998 = 1606.18 m, 2011 = 1607.02 m (peak),
      2012 = 1606.99 m; 2006-2020 trend about -0.03 m/year.
    We interpolate 2000-2011 and apply -0.03 m/year afterwards, preserving
    the published turning point. Clearly labelled as a reconstruction.
    """
    values = {
        2000: 1606.30,
        2001: 1606.38,
        2002: 1606.47,
        2003: 1606.56,
        2004: 1606.65,
        2005: 1606.74,
        2006: 1606.83,
        2007: 1606.90,
        2008: 1606.94,
        2009: 1606.97,
        2010: 1607.00,
        2011: 1607.02,
        2012: 1606.99,
    }
    for y in range(2013, PERIOD_END + 1):
        values[y] = round(values[y - 1] - 0.03, 3)
    points = [[f"{y:04d}-01-01", values[y], "reconstructed"] for y in sorted(values)]
    return {
        "points": points,
        "source": HYDROWEB_RECON_SOURCE,
        "dataset": "Реконструкция уровня Иссык-Куля по in situ и альтиметрии",
        "nativeStep": "year",
    }


# ---------------------------------------------------------------------------
# GeoJSON
# ---------------------------------------------------------------------------

def simplify_ring(ring: list[list[float]], tolerance: float = 0.008) -> list[list[float]]:
    """Douglas-Peucker for a closed ring."""
    if len(ring) < 8:
        return ring

    def perp(p, a, b):
        if a == b:
            return math.hypot(p[0] - a[0], p[1] - a[1])
        x, y = p
        x1, y1 = a
        x2, y2 = b
        dx, dy = x2 - x1, y2 - y1
        t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
        t = max(0.0, min(1.0, t))
        px, py = x1 + t * dx, y1 + t * dy
        return math.hypot(x - px, y - py)

    def dp(points):
        if len(points) < 3:
            return points
        a, b = points[0], points[-1]
        idx, dmax = 0, 0.0
        for i in range(1, len(points) - 1):
            d = perp(points[i], a, b)
            if d > dmax:
                idx, dmax = i, d
        if dmax > tolerance:
            left = dp(points[: idx + 1])
            right = dp(points[idx:])
            return left[:-1] + right
        return [a, b]

    open_ring = ring[:-1] if ring[0] == ring[-1] else ring
    if len(open_ring) < 8:
        return ring
    simplified = dp(open_ring)
    if simplified[0] != simplified[-1]:
        simplified.append(simplified[0])
    return simplified


def ring_area(ring: list[list[float]]) -> float:
    """Signed shoelace area in lon/lat; positive = counter-clockwise."""
    s = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        s += x1 * y2 - x2 * y1
    return s / 2.0


def orient_ring(ring: list[list[float]], exterior: bool) -> list[list[float]]:
    """d3-geo wants clockwise exterior rings and counter-clockwise holes.

    This is the opposite of the planar RFC 7946 convention; d3-geo uses the
    spherical winding rule. Getting it wrong makes a country render as the
    entire sphere (or as a tiny speck), so normalise it here.
    """
    a = ring_area(ring)
    if (exterior and a > 0) or ((not exterior) and a < 0):
        return list(reversed(ring))
    return ring


def orient_polygon(poly: list[list[list[float]]]) -> list[list[list[float]]]:
    return [orient_ring(r, i == 0) for i, r in enumerate(poly)]


REGION_GEO_MAP = {
    "Batken Region": ("batken", "Баткенская область", "Batken Region"),
    "Osh Region": ("osh-region", "Ошская область", "Osh Region"),
    "Talas Region": ("talas", "Таласская область", "Talas Region"),
    "Jalal-Abad Region": ("jalal-abad", "Джалал-Абадская область", "Jalal-Abad Region"),
    "Issyk-Kul Region": ("issyk-kul-region", "Иссык-Кульская область", "Issyk-Kul Region"),
    "Chuy Region": ("chuy", "Чуйская область", "Chuy Region"),
    "Naryn Region": ("naryn-region", "Нарынская область", "Naryn Region"),
}


def fetch_geojson() -> dict[str, Any] | None:
    url = "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/KGZ/ADM1/geoBoundaries-KGZ-ADM1.geojson"
    data = get_json(url, "kgz_adm1.geojson", retries=3, timeout=120)
    if not data:
        return None
    out_features = []
    for f in data.get("features", []):
        props = f.get("properties", {})
        raw_name = props.get("shapeName") or props.get("name") or "Регион"
        code, name_ru, name_en = REGION_GEO_MAP.get(raw_name, (raw_name, raw_name, raw_name))
        geom = f.get("geometry", {})
        if geom.get("type") == "Polygon":
            geom["coordinates"] = orient_polygon([simplify_ring(r) for r in geom["coordinates"]])
        elif geom.get("type") == "MultiPolygon":
            geom["coordinates"] = [
                orient_polygon([simplify_ring(r) for r in poly]) for poly in geom["coordinates"]
            ]
        out_features.append(
            {
                "type": "Feature",
                "properties": {
                    "name": name_ru,
                    "nameEn": name_en,
                    "code": code,
                    "rawName": raw_name,
                },
                "geometry": geom,
            }
        )
    return {"type": "FeatureCollection", "features": out_features}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("K2 ETL — real NASA / NOAA data")
    print(f"Period: {PERIOD_START}–{PERIOD_END}")

    objects = [dict(o) for o in OBJECTS]
    by_code = {o["code"]: o for o in objects}
    series: dict[str, dict[str, Any]] = {}

    # 1. NASA POWER for all catalog objects
    print("\n[1/5] NASA POWER monthly (MERRA-2 / GLDAS)")
    for i, obj in enumerate(objects, 1):
        if obj.get("isGlobal"):
            continue
        print(f"  [{i}/{len(objects)}] {obj['name']} ({obj['lat']}, {obj['lon']})")
        s = power_series_for_object(obj)
        for var, payload in s.items():
            key = f"{obj['code']}|{var}"
            series[key] = {"object": obj["code"], "variable": var, **payload}
        time.sleep(0.15)

    # 2. MODIS NDVI (optional; disabled by default because the public ORNL
    #    subset API takes ~60 s per point-year for a 26-year series).
    print("\n[2/5] MODIS NDVI (optional)")
    if not NDVI_OBJECTS:
        print("  skipped: ORNL subset API too slow for a 26-year point series")
    for code in NDVI_OBJECTS:
        obj = by_code.get(code)
        if not obj:
            continue
        print(f"  NDVI {obj['name']}")
        payload = modis_ndvi(obj)
        if payload:
            series[f"{code}|ndvi"] = {"object": code, "variable": "ndvi", **payload}
        else:
            print(f"    (no NDVI for {code})", file=sys.stderr)

    # 3. Snow-season length from NASA POWER daily snow depth.
    print("\n[3/5] Snow-season length (NASA POWER daily SNODP)")
    for code in SNOW_DAYS_OBJECTS:
        obj = by_code.get(code)
        if not obj:
            continue
        print(f"  Snow days {obj['name']}")
        payload = fetch_power_daily_snow(obj["lat"], obj["lon"], obj["code"])
        if payload:
            series[f"{code}|snow_days"] = {"object": code, "variable": "snow_days", **payload}
        else:
            print(f"    (no snow days for {code})", file=sys.stderr)

    # 4. NOAA global
    print("\n[4/5] NOAA global indicators")
    t = fetch_noaa_temp()
    if t:
        series["earth|global_temp"] = {"object": "earth", "variable": "global_temp", **t}
    c = fetch_co2()
    if c:
        series["earth|co2"] = {"object": "earth", "variable": "co2", **c}

    # 5. Lake level reconstruction
    print("\n[5/5] Lake level reconstruction (Issyk-Kul)")
    series["issyk-kul|lake_level"] = {"object": "issyk-kul", "variable": "lake_level", **lake_level_reconstruction()}

    # Grid points for arbitrary map clicks (POWER only)
    print("\n[+] Grid points for arbitrary map selection")
    grid_points = []
    lats = [39.6 + i * 0.8 for i in range(5)]  # 39.6..42.8
    lons = [69.6 + i * 1.4 for i in range(8)]  # 69.6..79.4
    idx = 0
    for lat in lats:
        for lon in lons:
            idx += 1
            tag = f"grid_{idx}"
            raw = fetch_power(lat, lon, tag)
            if not raw["T2M"]:
                continue
            gid = f"grid-{idx}"
            grid_points.append(
                {
                    "code": gid,
                    "type": "grid",
                    "name": f"Точка {lat:.1f}°N, {lon:.1f}°E",
                    "nameEn": f"Point {lat:.1f}N, {lon:.1f}E",
                    "lat": round(lat, 2),
                    "lon": round(lon, 2),
                    "region": "Произвольная точка",
                    "elevation": None,
                    "areaKm2": None,
                    "description": "Сеточная точка NASA POWER. Анализ по ближайшей ячейке, а не по границам объекта.",
                    "tags": ["сетка", "произвольная точка"],
                    "isGrid": True,
                }
            )
            for var, vals in {
                "t2m": raw["T2M"],
                "precip": raw["PRECTOTCORR"],
                "soil_moisture": raw["GWETROOT"],
                "snow_depth": raw["SNODP"],
            }.items():
                points = []
                for ds in sorted(vals):
                    y, m = int(ds[:4]), int(ds[5:7])
                    v = vals[ds]
                    if var == "soil_moisture":
                        v *= 100.0
                    elif var == "precip":
                        v *= month_days(y, m)
                    points.append([ds, rnd(v, 2), "ok"])
                series[f"{gid}|{var}"] = {
                    "object": gid,
                    "variable": var,
                    "points": points,
                    "source": POWER_SOURCE,
                    "dataset": "MERRA-2 / GLDAS (NASA POWER monthly), grid cell",
                    "nativeStep": "month",
                }
    objects.extend(grid_points)

    # GeoJSON
    print("\n[+] GeoJSON boundaries")
    geo = fetch_geojson()
    if geo:
        (GEO / "kyrgyzstan.json").write_text(json.dumps(geo, ensure_ascii=False))
        print(f"  features: {len(geo['features'])}")
    else:
        print("  ! GeoJSON unavailable", file=sys.stderr)

    # Build catalog: only available variables
    available: dict[str, list[str]] = {}
    for key in series:
        obj, var = key.split("|", 1)
        available.setdefault(obj, []).append(var)
    for obj in objects:
        allowed = TYPE_VARIABLES.get(obj["type"], [])
        obj["variables"] = [v for v in allowed if v in available.get(obj["code"], [])]
        if obj.get("isGlobal"):
            obj["variables"] = [v for v in ["global_temp", "co2"] if v in available.get(obj["code"], [])]

    # Series index + coverage
    index = []
    for key, s in sorted(series.items()):
        obj, var = key.split("|", 1)
        vdef = VARIABLES[var]
        points = s["points"]
        years = sorted({int(p[0][:4]) for p in points})
        expected_months = (PERIOD_END - PERIOD_START + 1) * 12 if s["nativeStep"] == "month" else (PERIOD_END - PERIOD_START + 1)
        coverage = min(1.0, len(points) / expected_months)
        index.append(
            {
                "id": key,
                "object": obj,
                "variable": var,
                "source": s["source"]["name"],
                "dataset": s["dataset"],
                "nativeStep": s["nativeStep"],
                "dateFrom": points[0][0] if points else None,
                "dateTo": points[-1][0] if points else None,
                "coverage": round(coverage, 3),
                "n": len(points),
                "unit": vdef["unit"],
                "yearlyAgg": vdef["yearlyAgg"],
                "seasonMonths": vdef["seasonMonths"],
                "isProxy": bool(vdef.get("isProxy") or s.get("isProxy")),
                "isReconstruction": bool(vdef.get("isReconstruction") or s.get("isReconstruction")),
            }
        )

    # Phenomena links
    phenomena = []
    for ph in PHENOMENA:
        links = []
        for obj in objects:
            if obj.get("isGlobal") or obj.get("isGrid"):
                continue
            for var in ph["localVariables"]:
                if var in obj.get("variables", []):
                    weight = 1.0
                    if obj["type"] == "glacier":
                        weight = 1.15
                    if obj.get("isRegulated"):
                        weight = 0.6
                    if var == "lake_level":
                        weight = 1.3
                    links.append(
                        {
                            "object": obj["code"],
                            "variable": var,
                            "weight": round(weight, 2),
                            "note": obj.get("regulatedNote") or obj.get("reconstructionNote") or None,
                        }
                    )
        phenomena.append({**ph, "links": links})

    # Chains: attach available variables per object at request time.
    # Keep only variables/sections that actually have at least one series.
    usedVariables = {s["variable"] for s in series.values()}
    usedSections = {VARIABLES[v]["section"] for v in usedVariables if v in VARIABLES}
    catalog_variables = [v for v in VARIABLES.values() if v["code"] in usedVariables]
    catalog_sections = [s for s in SECTIONS if s["code"] in usedSections]
    catalog_chains = [
        c for c in CHAINS if all(link["variable"] in usedVariables for link in c["links"])
    ]
    for v in catalog_variables:
        en = VARIABLE_EN.get(v["code"], {})
        v["descriptionEn"] = en.get("description", v["description"])
        v["whyItMattersEn"] = en.get("whyItMatters", v["whyItMatters"])
    for o in objects:
        o["descriptionEn"] = OBJECT_EN.get(o["code"], o["description"])

    catalog = {
        "meta": {
            "name": "K2",
            "tagline": "Earth System Trend Detective",
            "period": {"from": PERIOD_START, "to": PERIOD_END},
            "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "objectCount": len([o for o in objects if not o.get("isGrid")]),
            "gridCount": len([o for o in objects if o.get("isGrid")]),
            "variableCount": len(catalog_variables),
            "seriesCount": len(series),
            "sources": [
                {"name": "NASA POWER", "what": "температура, осадки, почвенная влага, испарение, снег (MERRA-2 / GLDAS / GPM IMERG)", "url": "https://power.larc.nasa.gov/"},
                {"name": "NOAA NCEI / GML", "what": "глобальная температура и CO₂", "url": "https://www.ncei.noaa.gov/"},
                {"name": "GeoBoundaries", "what": "границы регионов (ODbL)", "url": "https://www.geoboundaries.org/"},
                {"name": "Zhang et al., 2022", "what": "опорные значения уровня Иссык-Куля (реконструкция)", "url": "https://doi.org/10.3390/rs14071575"},
            ],
        },
        "sections": catalog_sections,
        "variables": catalog_variables,
        "objects": objects,
        "seriesIndex": index,
        "phenomena": phenomena,
        "chains": catalog_chains,
    }

    (DATA / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")))
    (DATA / "series.json").write_text(json.dumps(series, ensure_ascii=False, separators=(",", ":")))
    (DATA / "meta.json").write_text(
        json.dumps(
            {
                "generatedAt": catalog["meta"]["generatedAt"],
                "period": catalog["meta"]["period"],
                "seriesCount": len(series),
                "objectCount": catalog["meta"]["objectCount"],
                "gridCount": catalog["meta"]["gridCount"],
                "sources": catalog["meta"]["sources"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )

    print("\nDone.")
    print(f"  objects: {len(objects)} ({len(grid_points)} grid)")
    print(f"  series: {len(series)}")
    print(f"  catalog: {DATA / 'catalog.json'} ({(DATA / 'catalog.json').stat().st_size / 1024:.1f} KB)")
    print(f"  series:  {DATA / 'series.json'} ({(DATA / 'series.json').stat().st_size / 1024:.1f} KB)")
    print(f"  geo:     {GEO / 'kyrgyzstan.json'}")


if __name__ == "__main__":
    main()
