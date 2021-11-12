import calcStatsFn from "calc-stats";
import flatIter from "flat-iter";
import findAndRead from "find-and-read";
import test from "flug";
import parseGeoTIFF from "../src/geotiff/parse-geotiff.js";
import wrapGeoTIFF from "../src/geotiff/wrap-geotiff.js";

test("Parse OSGEO Sample Raster", async ({ eq }) => {
    const data = findAndRead("GeogToWGS84GeoKey5.tif");
    const georaster = await parseGeoTIFF({ data, calcStats: true, debugLevel: 0 });
    eq(georaster.pixelDepth, 1);
    eq(georaster.srs.code, 32767);
});

test("Wrap OSGEO Sample Raster", async ({ eq }) => {
    const data = findAndRead("GeogToWGS84GeoKey5.tif");
    const georaster = await wrapGeoTIFF({ data, calcStats: true, debugLevel: 0 });
    eq(georaster.pixelDepth, 1);
    eq(georaster.numberOfRasters, 1);
    eq(georaster.projection, 32767);
    const values = await georaster.getValues();
    eq(values[0].length, georaster.height);
    eq(values[0][0].length, georaster.width);
});

// Using tiff created from http://geomap.arpa.veneto.it/geoserver/wcs?crs=EPSG%3A4326&service=WCS&format=GeoTIFF&request=GetCoverage&height=329&width=368&version=1.0.0&BBox=9.679858245722988%2C13.951082737884812%2C44.183855724634675%2C47.38727409375604&Coverage=geonode%3Aatlanteil
test("should parse GeoNode WCS Export Correctly", async ({ eq }) => {
    const data = findAndRead("geonode_atlanteil.tif");
    const georaster = await wrapGeoTIFF({ data, debugLevel: 0 });
    eq(georaster.xmin, 10.2822923743907);
    eq(georaster.xmax, 13.3486486092171);
    eq(georaster.ymin, 44.418521542726054);
    eq(georaster.ymax, 47.15260827566466);
    eq(georaster.projection, 4326);

    const values = await georaster.getValues();
    eq(values.length, 1);
    eq(values[0].length, 329);
    eq(values[0][0].length, 368);
    eq(georaster.maxs[0], 5.398769378662109);
    eq(georaster.mins[0], 0);
});

test("parsing RGB raster", async ({ eq }) => {
    const data = findAndRead("rgb_raster.tif");
    const first_georaster = await wrapGeoTIFF(data);
    eq(first_georaster.numberOfRasters, 3);
    eq(first_georaster.projection, 4326);
    const expected_height = 3974;
    const expected_width = 7322;
    const first_values = await first_georaster.getValues({ debugLevel: 0 });
    eq(first_values[0].length, expected_height);
    eq(first_values[0][0].length, expected_width);
    eq(first_georaster.pixelHeight, 0.0002695191463334987);
    eq(first_georaster.pixelWidth, 0.0002695191463334988);
    eq(first_georaster.xmin, -125.57865783690451);
    eq(first_georaster.noDataValue, undefined);
});

test("parsing paletted raster", async ({ eq }) => {
    const data = findAndRead("rgb_paletted.tiff");
    const georaster = await wrapGeoTIFF(data);
    eq(Array.isArray(georaster.palette), true);
    eq(georaster.palette.length, 256);
    eq(georaster.palette.slice(0, 5), [
        [112, 108, 96, 255],
        [112, 104, 80, 255],
        [104, 104, 104, 255],
        [96, 88, 52, 255],
        [104, 104, 112, 255]
    ]);
});

test("parse landsat-pds", async ({ eq }) => {
    const raster_url =
        "https://landsat-pds.s3.amazonaws.com/c1/L8/024/030/LC08_L1TP_024030_20180723_20180731_01_T1/LC08_L1TP_024030_20180723_20180731_01_T1_B1.TIF";
    const georaster = await parseGeoTIFF(raster_url, null, false);
    eq(georaster.height, 8031);
    eq(georaster.width, 7921);
    eq(georaster.pixelDepth, 1);
    eq(georaster.pixelHeight, 30);
    eq(georaster.pixelWidth, 30);
    eq(georaster.srs.code, 32616);
    eq(georaster.xmin, 189600);
    eq(georaster.xmax, 427230);
    eq(georaster.ymin, 4663170);
    eq(georaster.ymax, 4904100);
    eq(georaster.noDataValue, null);
});

test("landsat-pds", async ({ eq }) => {
    const raster_url =
        "https://landsat-pds.s3.amazonaws.com/c1/L8/024/030/LC08_L1TP_024030_20180723_20180731_01_T1/LC08_L1TP_024030_20180723_20180731_01_T1_B1.TIF";
    const georaster = await wrapGeoTIFF(raster_url, null, true);
    eq(georaster.numberOfRasters, 1);
    eq(georaster.projection, 32616);
    eq(georaster.height, 8031);
    eq(georaster.width, 7921);
    eq(georaster.pixelHeight, 30);
    eq(georaster.pixelWidth, 30);
    eq(georaster.xmin, 189600);
    eq(georaster.xmax, 427230);
    eq(georaster.ymin, 4663170);
    eq(georaster.ymax, 4904100);
    eq(georaster.noDataValue, undefined);

    const options = {
        left: 0,
        top: 0,
        right: 4000,
        bottom: 4000,
        width: 10,
        height: 10
    };
    const values = await georaster.getValues(options);
    const numBands = values.length;
    const numRows = values[0].length;
    const numColumns = values[0][0].length;
    eq(numBands, 1);
    eq(numRows, 10);
    eq(numColumns, 10);

    const stats = calcStatsFn(flatIter(values[0]), { calcHistogram: false });
    eq(stats, { median: 10193.5, min: 0, max: 11530, sum: 689290, mean: 6892.9, modes: [0], mode: 0 });
});

test("landsat-pds without resampling", async ({ eq }) => {
    const raster_url =
        "https://landsat-pds.s3.amazonaws.com/c1/L8/024/030/LC08_L1TP_024030_20180723_20180731_01_T1/LC08_L1TP_024030_20180723_20180731_01_T1_B1.TIF";
    const georaster = await wrapGeoTIFF({ data: raster_url });

    const options = {
        left: 0,
        top: 0,
        right: 4000,
        bottom: 4000,
        width: 10,
        height: 10,
        resample: false
    };
    const values = await georaster.getValues(options);
    const numBands = values.length;
    const numRows = values[0].length;
    const numColumns = values[0][0].length;
    eq(numBands, 1);
    eq(numRows, 4031);
    eq(numColumns, 3921);

    const stats = calcStatsFn(flatIter(values[0]), { calcHistogram: false });
    eq(stats, { median: 10193, min: 0, max: 52172, sum: 123740673528, mean: 7828.937664242138, modes: [0], mode: 0 });
});